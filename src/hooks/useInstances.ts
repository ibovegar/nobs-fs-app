import { useSyncExternalStore } from 'react'
import { isNative, listNativeDevices, onNativeDevicesChange } from '~/io'
import { type DeviceKind, identifyDevice, MAX_INSTANCES } from '~/panel'

// Which physical modules of each product are active, held as the set of instance numbers.
// The lowest is the "primary" (App owns its watcher, Home renders it as the main card);
// the rest are extra cards. Tracking a set (rather than a count) lets a specific unit be
// removed without renumbering the others' USB IDs. Shared via an external store so the
// Home and Devices pages stay in sync without prop-drilling.
//
// Two backings, picked once at load by environment:
//   • Native (Tauri): the set is whatever the HID bus actually reports present, live
//     (see io/nativeDevices). A module is shown iff it's plugged in, on any PID slot, so
//     there's nothing to configure — unplug it and its card disappears. Sets can be empty.
//   • Web: enumeration needs a per-device WebHID grant, so the user manages the set by
//     hand with the Devices page +/× and we persist it across reloads. Each product keeps
//     at least one instance here.

const KEY = 'nobs.instances'
const LEGACY_KEY = 'nobs.instanceCounts' // pre-set model: { kind: count }
type Instances = Record<DeviceKind, number[]>
const KINDS: DeviceKind[] = ['autopilot', 'approach', 'panel']

// Stable for the app's lifetime (set by a window global), so it's safe to choose the
// store backing from it once rather than branching hook calls per render.
const NATIVE = isNative()

const listeners = new Set<() => void>()
let cache: Instances | null = null

const defaults = (): Instances => ({ autopilot: [1], approach: [1], panel: [1] })

/** Drop out-of-range/duplicate slots, sort ascending, fall back to [1] if none remain. */
function normalize(list: unknown): number[] {
  const set = new Set<number>()
  if (Array.isArray(list)) {
    for (const v of list) {
      const n = Number(v)
      if (Number.isInteger(n) && n >= 1 && n <= MAX_INSTANCES) set.add(n)
    }
  }
  if (set.size === 0) set.add(1)
  return [...set].sort((a, b) => a - b)
}

function read(): Instances {
  if (cache) return cache
  let value = defaults()
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Record<DeviceKind, number[]>>
      for (const k of KINDS) value[k] = normalize(parsed[k])
    } else {
      // Migrate the legacy count model ({ kind: N } -> [1..N]).
      const legacy = localStorage.getItem(LEGACY_KEY)
      if (legacy) {
        const counts = JSON.parse(legacy) as Partial<Record<DeviceKind, number>>
        for (const k of KINDS) {
          const n = Number(counts[k])
          value[k] = normalize(
            Number.isInteger(n) && n > 0 ? Array.from({ length: n }, (_, i) => i + 1) : [1],
          )
        }
      }
    }
  } catch {
    value = defaults()
  }
  cache = value
  return value
}

function write(next: Instances) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable (private mode); keep the in-memory value for the session.
  }
  for (const l of listeners) l()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

// ── Native (live HID bus) backing ────────────────────────────────────────────
// Populated from the enumeration the Rust bridge pushes; a kind with nothing
// plugged in stays an empty list (its product is hidden). The subscription is
// started lazily on first use and never torn down (app-lifetime singleton).

const nativeListeners = new Set<() => void>()
let nativeCache: Instances = { autopilot: [], approach: [], panel: [] }
let nativeStarted = false

function applyNative(ids: { vid: number; pid: number }[]) {
  const next: Instances = { autopilot: [], approach: [], panel: [] }
  for (const { vid, pid } of ids) {
    const found = identifyDevice(vid, pid)
    if (found) next[found.kind].push(found.instance)
  }
  for (const k of KINDS) next[k] = [...new Set(next[k])].sort((a, b) => a - b)
  nativeCache = next
  for (const l of nativeListeners) l()
}

function startNative() {
  if (nativeStarted) return
  nativeStarted = true
  // Immediate snapshot, then live updates on every plug/unplug.
  listNativeDevices().then(applyNative).catch(noop)
  onNativeDevicesChange(applyNative)
}

function noop() {}

function subscribeNative(cb: () => void) {
  startNative()
  nativeListeners.add(cb)
  return () => {
    nativeListeners.delete(cb)
  }
}

function readNative(): Instances {
  return nativeCache
}

/**
 * Reactive per-product set of active instance numbers. Native: the modules
 * actually present on the HID bus (may be empty). Web: the persisted, manually
 * managed set (always at least one per product).
 */
export function useInstances(): Instances {
  return useSyncExternalStore(
    NATIVE ? subscribeNative : subscribe,
    NATIVE ? readNative : read,
    NATIVE ? readNative : read,
  )
}

/** Add the next module of a product, filling the lowest free slot (up to MAX_INSTANCES). */
export function addInstance(kind: DeviceKind) {
  if (NATIVE) return // native sets follow the bus, not manual edits
  const cur = read()[kind]
  if (cur.length >= MAX_INSTANCES) return
  let n = 1
  while (cur.includes(n)) n++
  if (n > MAX_INSTANCES) return
  write({ ...read(), [kind]: [...cur, n].sort((a, b) => a - b) })
}

/**
 * Stop tracking one module of a product. A product always keeps at least one instance, so
 * the last remaining one can't be removed; removing the lowest promotes the next up to primary.
 */
export function removeInstance(kind: DeviceKind, instance: number) {
  if (NATIVE) return // native sets follow the bus, not manual edits
  const cur = read()[kind]
  if (cur.length <= 1 || !cur.includes(instance)) return
  write({ ...read(), [kind]: cur.filter((n) => n !== instance) })
}
