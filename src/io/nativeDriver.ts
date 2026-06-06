import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type { DeviceConfig } from '~/panel'
import { decodeJoystickReport } from './decodeReport'
import type { DeviceDriver, SnapshotListener } from './types'

// ── Native (Tauri) HID driver ────────────────────────────────────────────────
// Detection here is automatic: the Rust backend (src-tauri/src/hid.rs)
// enumerates the device via the `hidapi` crate and pushes input reports, so no
// knob-turn is needed.
//
//   #[tauri::command] hid_open(vid, pid)  / hid_close(vid, pid)
//   event "hid://report"     { vid, pid, bytes }      on each report
//   event "hid://connection" { vid, pid, connected }  on plug / unplug
//
// Report decoding is shared with the web driver (`decodeJoystickReport`).

export const nativeDriver: DeviceDriver = {
  name: 'native-tauri',

  watch(device: DeviceConfig, onSnapshot: SnapshotListener) {
    const vid = Number.parseInt(device.vid, 16)
    const pid = Number.parseInt(device.pid, 16)
    const matches = (p: { vid: number; pid: number }) => p.vid === vid && p.pid === pid

    let disposed = false
    const unlisteners: Array<() => void> = []
    const track = (p: Promise<() => void>) => {
      p.then((un) => (disposed ? un() : unlisteners.push(un)))
    }

    track(
      listen<{ vid: number; pid: number; bytes: number[] }>('hid://report', (e) => {
        if (matches(e.payload)) {
          const pressed = decodeJoystickReport(Uint8Array.from(e.payload.bytes), device.buttonCount)
          onSnapshot({ connected: true, pressed })
        }
      }),
    )
    track(
      listen<{ vid: number; pid: number; connected: boolean }>('hid://connection', (e) => {
        if (matches(e.payload) && !e.payload.connected) {
          onSnapshot({ connected: false, pressed: [] })
        }
      }),
    )

    invoke('hid_open', { vid, pid })

    return () => {
      disposed = true
      for (const un of unlisteners) un()
      invoke('hid_close', { vid, pid })
    }
  },
}
