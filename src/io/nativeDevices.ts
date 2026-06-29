import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

// ── Native HID enumeration ───────────────────────────────────────────────────
// The Rust bridge (src-tauri/src/hid.rs) continuously enumerates the USB HID bus
// and reports which devices are present, so the native app can auto-detect the
// connected Nobs modules — across every PID slot — instead of guessing from a
// saved instance set. `hid_list` is the one-shot initial snapshot; the
// `hid://devices` event fires on every plug/unplug after that.

export interface NativeDeviceId {
  vid: number
  pid: number
}

/** Current snapshot of every HID device on the bus. */
export function listNativeDevices(): Promise<NativeDeviceId[]> {
  return invoke<NativeDeviceId[]>('hid_list')
}

/** Subscribe to bus changes (plug/unplug). Returns an unsubscribe. */
export function onNativeDevicesChange(cb: (ids: NativeDeviceId[]) => void): () => void {
  let active = true
  const un = listen<NativeDeviceId[]>('hid://devices', (e) => {
    if (active) cb(e.payload)
  })
  return () => {
    active = false
    un.then((f) => f())
  }
}
