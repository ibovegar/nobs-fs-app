import type { DeviceConfig } from '~/panel'
import { decodeJoystickReport } from './decodeReport'
import type { DeviceDriver, SnapshotListener } from './types'

// Web driver with automatic detection (Chromium only). Unlike the Gamepad API,
// WebHID surfaces an already-permitted device on load and via connect/disconnect
// events — no knob-turn. The catch: a one-time `requestDevices` permission grant
// from a user gesture (see the Devices page). After that it persists per-origin.

interface Session {
  device: DeviceConfig
  onSnapshot: SnapshotListener
  hid: HIDDevice | null
  onInput: ((ev: HIDInputReportEvent) => void) | null
}

const sessions = new Set<Session>()

const idOf = (c: DeviceConfig): HIDDeviceFilter => ({
  vendorId: Number.parseInt(c.vid, 16),
  productId: Number.parseInt(c.pid, 16),
})

const matches = (d: HIDDevice, c: DeviceConfig) =>
  d.vendorId === Number.parseInt(c.vid, 16) && d.productId === Number.parseInt(c.pid, 16)

async function openFor(session: Session) {
  if (!navigator.hid || session.hid?.opened) return

  const dev = (await navigator.hid.getDevices()).find((d) => matches(d, session.device)) ?? null
  if (!dev) {
    session.onSnapshot({ connected: false, pressed: [] })
    return
  }

  try {
    if (!dev.opened) await dev.open()
  } catch {
    // Device may be claimed elsewhere; report disconnected and bail.
    session.onSnapshot({ connected: false, pressed: [] })
    return
  }

  const onInput = (ev: HIDInputReportEvent) => {
    const bytes = new Uint8Array(ev.data.buffer, ev.data.byteOffset, ev.data.byteLength)
    session.onSnapshot({
      connected: true,
      pressed: decodeJoystickReport(bytes, session.device.buttonCount),
    })
  }
  dev.addEventListener('inputreport', onInput)
  session.hid = dev
  session.onInput = onInput
  // Mark connected immediately; buttons arrive on the first report.
  session.onSnapshot({ connected: true, pressed: [] })

  // Pull the current state right away via the Feature report so resting switch
  // positions appear on open instead of on the first actuation. Firmware that
  // doesn't expose it throws here, and the device's heartbeat then covers the
  // sync. For this unnumbered report WebHID returns just the report bytes.
  try {
    const fr = await dev.receiveFeatureReport(0)
    const bytes = new Uint8Array(fr.buffer, fr.byteOffset, fr.byteLength)
    if (bytes.length > 0) {
      session.onSnapshot({
        connected: true,
        pressed: decodeJoystickReport(bytes, session.device.buttonCount),
      })
    }
  } catch {
    // Feature report unsupported (older firmware) — fall back to inputreport.
  }
}

function closeFor(session: Session) {
  if (session.hid && session.onInput) {
    session.hid.removeEventListener('inputreport', session.onInput)
  }
  session.hid = null
  session.onInput = null
}

let globalAttached = false
function attachGlobal() {
  if (globalAttached || !navigator.hid) return
  globalAttached = true

  navigator.hid.addEventListener('connect', (ev) => {
    for (const s of sessions) if (matches(ev.device, s.device)) void openFor(s)
  })
  navigator.hid.addEventListener('disconnect', (ev) => {
    for (const s of sessions) {
      if (s.hid === ev.device || matches(ev.device, s.device)) {
        closeFor(s)
        s.onSnapshot({ connected: false, pressed: [] })
      }
    }
  })
}

export const webhidDriver: DeviceDriver = {
  name: 'webhid',

  watch(device: DeviceConfig, onSnapshot: SnapshotListener) {
    if (!navigator.hid) {
      onSnapshot({ connected: false, pressed: [] })
      return () => {}
    }
    attachGlobal()
    const session: Session = { device, onSnapshot, hid: null, onInput: null }
    sessions.add(session)
    void openFor(session)

    return () => {
      closeFor(session)
      sessions.delete(session)
    }
  },
}

/**
 * Prompt the user to grant access to one of the given devices. MUST be called
 * from a user gesture (button click). After a grant, active watchers pick the
 * device up automatically and stay connected across reloads and replugs.
 */
export async function requestHidDevices(devices: DeviceConfig[]) {
  if (!navigator.hid) return
  await navigator.hid.requestDevice({ filters: devices.map(idOf) })
  for (const s of sessions) void openFor(s)
}

/** Whether WebHID is available in this environment (Chromium). */
export const webhidSupported = () => typeof navigator !== 'undefined' && 'hid' in navigator

/**
 * For each given device, whether the origin already has permission to it (it
 * shows up in `navigator.hid.getDevices()`). Granted devices need no re-prompt.
 */
export async function grantedFlags(devices: DeviceConfig[]): Promise<boolean[]> {
  if (!navigator.hid) return devices.map(() => false)
  const granted = await navigator.hid.getDevices()
  return devices.map((c) => granted.some((d) => matches(d, c)))
}

/** Subscribe to HID plug/unplug so granted state can be refreshed. Returns an unsubscribe. */
export function onHidChange(listener: () => void): () => void {
  const hid = navigator.hid
  if (!hid) return () => {}
  hid.addEventListener('connect', listener)
  hid.addEventListener('disconnect', listener)
  return () => {
    hid.removeEventListener('connect', listener)
    hid.removeEventListener('disconnect', listener)
  }
}
