import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { WINDY_USB_PID, WINDY_USB_VID } from '~/panel'

// ── Windy serial link (native / Tauri) ───────────────────────────────────────
// WebView2 has no Web Serial, so the native build goes through Rust
// (src-tauri/src/windy.rs), which keeps the port open in a worker thread and
// pushes `windy://line` / `windy://connection` events. Same surface as
// `windySerial`, so `windy.ts` can pick between them.
//
// There is no permission grant natively — the backend finds the port by VID/PID
// itself — so `connect` is just "make sure the watcher is running".

const listeners = new Set<(line: string) => void>()
const connectionListeners = new Set<(connected: boolean) => void>()

let connected = false
let started = false

/** Native can always open a port; no browser API needed. */
export const windySupported = () => true

export const windyConnected = () => connected

/**
 * Start the Rust watcher (idempotent) and wire its events into our listener
 * sets. The watcher reconnects on its own, so this runs once for the session.
 */
function start() {
  if (started) return
  started = true

  listen<{ line: string }>('windy://line', (e) => {
    for (const l of listeners) l(e.payload.line)
  })
  listen<{ connected: boolean }>('windy://connection', (e) => {
    if (connected === e.payload.connected) return
    connected = e.payload.connected
    for (const l of connectionListeners) l(connected)
  })

  invoke('windy_open', { vid: WINDY_USB_VID, pid: WINDY_USB_PID }).catch(() => {
    started = false // the bridge is unavailable; let a later call retry
  })
}

/**
 * Why the last attempt failed. The Rust watcher retries by itself and reports
 * through `windy://connection`, so there is no one-shot failure to report here.
 */
export const windyError = () => null

export async function reconnectWindy(): Promise<boolean> {
  start()
  return connected
}

/**
 * Stop the Rust watcher and let go of the port. Same reason as the web build: a
 * COM port has one owner, so avrdude can't flash the board while we hold it.
 */
export async function disconnectWindy(): Promise<void> {
  await invoke('windy_close').catch(() => {})
  started = false // let a later connect start a fresh watcher
  if (connected) {
    connected = false
    for (const l of connectionListeners) l(false)
  }
}

// Nothing to grant natively — "connecting" is just ensuring the watcher runs.
export const connectWindy = reconnectWindy

export async function sendWindy(line: string): Promise<boolean> {
  return invoke('windy_send', { line })
    .then(() => true)
    .catch(() => false)
}

export function onWindyLine(cb: (line: string) => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/**
 * Subscribe to link up/down. A subscriber arriving while the link is already up
 * is primed immediately — the Rust watcher runs for the session, so its
 * "connected" event may well have fired before this listener existed (see the
 * same note in `windySerial`).
 */
export function onWindyConnection(cb: (isConnected: boolean) => void) {
  connectionListeners.add(cb)
  if (connected) cb(true)
  return () => {
    connectionListeners.delete(cb)
  }
}
