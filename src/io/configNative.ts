import { invoke } from '@tauri-apps/api/core'
import { DEVICES } from '~/panel'

// Native (Tauri) panel config channel. WebView2 has no Web Serial, so we go
// through Rust serial commands (src-tauri/src/serial.rs). No port grant is needed
// — the backend finds the panel's CDC port by VID/PID and writes to it.

const { autopilot } = DEVICES
const VID = Number.parseInt(autopilot.vid, 16)
const PID = Number.parseInt(autopilot.pid, 16)

let present = false

/** Native can always configure (no browser API needed). */
export const nativeSupported = () => true

/** Whether a matching panel serial port was last seen. */
export const nativeConnected = () => present

/** Check whether the panel's serial port is plugged in. */
export async function nativeReconnect(): Promise<boolean> {
  present = await invoke<boolean>('panel_serial_present', { vid: VID, pid: PID }).catch(() => false)
  return present
}

// No user gesture / grant needed natively — "connecting" is just re-detecting.
export const nativeConnect = nativeReconnect

/** Send encoder `index`'s acceleration sensitivity (0..255) to the firmware. */
export async function nativeSend(index: number, value: number): Promise<boolean> {
  const v = Math.max(0, Math.min(255, Math.round(value)))
  present = await invoke('panel_serial_send', { vid: VID, pid: PID, line: `A${index}${v}\n` })
    .then(() => true)
    .catch(() => false)
  return present
}
