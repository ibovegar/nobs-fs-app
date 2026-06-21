import { useSyncExternalStore } from 'react'
import { type DeviceKind, MAX_INSTANCES } from '~/panel'

// How many physical modules of each product the user has added. Persisted so the
// app keeps watching the same set across reloads. Default 1 of each: extra instances
// are opt-in, so a single-device user never pays for watchers (or, on native, worker
// threads) they don't need. Shared via an external store so the Home and Devices
// pages stay in sync without prop-drilling.

const KEY = 'nobs.instanceCounts'
type Counts = Record<DeviceKind, number>
const DEFAULTS: Counts = { autopilot: 1, approach: 1, panel: 1 }

const listeners = new Set<() => void>()
let cache: Counts | null = null

function read(): Counts {
  if (cache) return cache
  let value: Counts
  try {
    const raw = localStorage.getItem(KEY)
    value = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    value = DEFAULTS
  }
  cache = value
  return value
}

function write(next: Counts) {
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

/** Reactive per-product instance counts. */
export function useInstanceCounts(): Counts {
  return useSyncExternalStore(subscribe, read, read)
}

/** Set how many modules of a product are tracked (clamped to [1, MAX_INSTANCES]). */
export function setInstanceCount(kind: DeviceKind, count: number) {
  const clamped = Math.max(1, Math.min(MAX_INSTANCES, count))
  if (read()[kind] === clamped) return
  write({ ...read(), [kind]: clamped })
}
