import type { DeviceConfig } from '~/panel'
import { decodeJoystickReport } from './decodeReport'
import type { DeviceDriver, SnapshotListener } from './types'

// ── Native (Tauri) HID driver — SCAFFOLD ─────────────────────────────────────
// Detection here is automatic: the Rust backend enumerates the device via the
// `hidapi` crate on launch and pushes input reports, so no knob-turn is needed.
//
// Rust side to implement (Tauri commands + events):
//   #[tauri::command] async fn hid_open(vid: u16, pid: u16) -> Result<()>
//   #[tauri::command] async fn hid_close(vid: u16, pid: u16) -> Result<()>
//   app.emit("hid://report",     { vid, pid, bytes: Vec<u8> })   // on each report
//   app.emit("hid://connection", { vid, pid, connected: bool })  // on plug/unplug
//
// Report decoding is shared with the web driver (`decodeJoystickReport`), so the
// only work left on this side is the Rust backend.
// TODO(native): once `@tauri-apps/api` is a dependency, swap the
//   `window.__TAURI__` lookups below for its typed `invoke` / `listen`.

interface TauriGlobal {
  core: { invoke(cmd: string, args?: Record<string, unknown>): Promise<unknown> }
  event: {
    listen(name: string, handler: (e: { payload: unknown }) => void): Promise<() => void>
  }
}

const tauri = (): TauriGlobal | null =>
  (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__ ?? null

export const nativeDriver: DeviceDriver = {
  name: 'native-tauri',

  watch(device: DeviceConfig, onSnapshot: SnapshotListener) {
    const api = tauri()
    if (!api) {
      // Flagged as native by env detection, but the bridge isn't ready.
      onSnapshot({ connected: false, pressed: [] })
      return () => {}
    }

    const vid = Number.parseInt(device.vid, 16)
    const pid = Number.parseInt(device.pid, 16)
    const matches = (p: { vid: number; pid: number }) => p.vid === vid && p.pid === pid

    let disposed = false
    const unlisteners: Array<() => void> = []
    const track = (p: Promise<() => void>) => {
      p.then((un) => (disposed ? un() : unlisteners.push(un)))
    }

    track(
      api.event.listen('hid://report', (e) => {
        const p = e.payload as { vid: number; pid: number; bytes: number[] }
        if (matches(p)) {
          const pressed = decodeJoystickReport(Uint8Array.from(p.bytes), device.buttonCount)
          onSnapshot({ connected: true, pressed })
        }
      }),
    )
    track(
      api.event.listen('hid://connection', (e) => {
        const p = e.payload as { vid: number; pid: number; connected: boolean }
        if (matches(p) && !p.connected) onSnapshot({ connected: false, pressed: [] })
      }),
    )

    api.core.invoke('hid_open', { vid, pid })

    return () => {
      disposed = true
      for (const un of unlisteners) un()
      api.core.invoke('hid_close', { vid, pid })
    }
  },
}
