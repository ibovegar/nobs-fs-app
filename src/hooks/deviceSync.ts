import type { ButtonState } from '~/panel'

export interface DeviceEvent {
  id: number
  time: number
  type: 'press' | 'release'
}

export interface DeviceSnapshot {
  connected: boolean
  pressed: boolean[]
}

// Cheap mechanical switches/encoders can chatter for a few ms when actuated —
// the contact bit flickers before settling, which otherwise reads as several
// rapid presses (duplicate log entries, inflated counts) for one actuation.
export const DEBOUNCE_MS = 30

export const freshButtons = (count: number): ButtonState[] =>
  Array.from({ length: count }, () => ({ pressed: false, lastPress: 0, count: 0 }))

// Internal edge-detection state. `isConnected` mirrors the UI flag; `synced`
// tracks whether the device's resting baseline has been adopted since the last
// connect; `lastEdge` holds per-button edge timestamps for debouncing.
export interface SyncState {
  isConnected: boolean
  synced: boolean
  buttons: ButtonState[]
  lastEdge: number[]
}

export const initialSyncState = (count: number): SyncState => ({
  isConnected: false,
  synced: false,
  buttons: freshButtons(count),
  lastEdge: [],
})

export interface ReduceResult {
  state: SyncState
  events: DeviceEvent[]
  /** Whether the React-visible part (isConnected / buttons) changed. */
  changed: boolean
}

/**
 * Pure edge detector: folds a raw driver snapshot into the next device state and
 * the events it produced. Kept free of React/refs so the tricky bits — connect
 * baseline handling, debounce, and the WebHID "connected before the first report"
 * race — stay unit testable.
 */
export function reduceSnapshot(state: SyncState, snap: DeviceSnapshot, now: number): ReduceResult {
  const { connected, pressed } = snap
  const events: DeviceEvent[] = []

  if (!connected) {
    if (!state.isConnected) return { state, events, changed: false }
    const buttons = state.buttons.map((b) => (b.pressed ? { ...b, pressed: false } : b))
    return {
      state: { ...state, isConnected: false, synced: false, buttons },
      events,
      changed: true,
    }
  }

  // An empty snapshot announces the connection without any button data (WebHID
  // sends one before the first input report). Reflect "connected" in the UI, but
  // never feed it into edge detection — taken literally it reads as every button
  // releasing, and adopting it as the baseline makes the real first report look
  // like a burst of presses, flashing every already-engaged switch.
  if (pressed.length === 0) {
    if (state.isConnected) return { state, events, changed: false }
    return { state: { ...state, isConnected: true }, events, changed: true }
  }

  // The first report carrying data establishes the resting baseline silently: an
  // already-engaged switch is a rest position, not a fresh actuation, so it emits
  // no event and does not bump lastPress/count.
  if (!state.synced) {
    const buttons = state.buttons.map((b, i) => {
      const isDown = pressed[i] ?? false
      return isDown === b.pressed ? b : { ...b, pressed: isDown }
    })
    return { state: { ...state, isConnected: true, synced: true, buttons }, events, changed: true }
  }

  const lastEdge = state.lastEdge.slice()
  let changed = false
  const buttons = state.buttons.map((b, i) => {
    const isDown = pressed[i] ?? false
    if (isDown === b.pressed) return b

    // Debounce contact chatter: ignore an edge within DEBOUNCE_MS of this button's
    // last one — it's the switch bouncing, not a new actuation. The timestamp is
    // recorded even when suppressed so a bounce train keeps extending the window.
    const sinceLastEdge = now - (lastEdge[i] ?? 0)
    lastEdge[i] = now
    if (sinceLastEdge < DEBOUNCE_MS) return b

    changed = true
    if (isDown) {
      events.push({ id: i, time: now, type: 'press' })
      return { pressed: true, lastPress: now, count: b.count + 1 }
    }
    events.push({ id: i, time: now, type: 'release' })
    return { ...b, pressed: false }
  })

  // lastEdge may have advanced from a suppressed bounce even when nothing
  // React-visible changed — keep it so the next edge still sees the window.
  if (!changed) return { state: { ...state, lastEdge }, events, changed: false }
  return { state: { ...state, isConnected: true, buttons, lastEdge }, events, changed: true }
}
