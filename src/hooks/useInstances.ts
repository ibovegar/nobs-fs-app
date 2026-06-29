import { useSyncExternalStore } from 'react'
import { type DeviceKind, MAX_INSTANCES } from '~/panel'

// Which physical modules of each product the user is tracking, held as the set of active
// instance numbers. Persisted so the app keeps watching the same set across reloads. Each
// product keeps at least one instance, but which one is not fixed: the lowest tracked
// instance is the "primary" (App owns its watcher, Home renders it as the main card). So a
// user who swaps their instance-1 unit for, say, a left-mount instance-2 board can remove
// instance 1 and have instance 2 promoted to primary. Extra instances are opt-in, so a
// single-device user never pays for watchers (or, on native, worker threads) they don't
// need. Tracking a set rather than a count lets the user remove a specific unit without
// renumbering the others' USB IDs. Shared via an external store so the Home and Devices
// pages stay in sync without prop-drilling.

const KEY = 'nobs.instances'
const LEGACY_KEY = 'nobs.instanceCounts' // pre-set model: { kind: count }
type Instances = Record<DeviceKind, number[]>
const KINDS: DeviceKind[] = ['autopilot', 'approach', 'panel']

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

/** Reactive per-product set of active instance numbers (always includes instance 1). */
export function useInstances(): Instances {
  return useSyncExternalStore(subscribe, read, read)
}

/** Add the next module of a product, filling the lowest free slot (up to MAX_INSTANCES). */
export function addInstance(kind: DeviceKind) {
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
  const cur = read()[kind]
  if (cur.length <= 1 || !cur.includes(instance)) return
  write({ ...read(), [kind]: cur.filter((n) => n !== instance) })
}
