import { DEVICES } from '~/panel'

// Host → panel config channel over the USB CDC serial port (Web Serial). Separate
// from the read-only HID input path: the firmware reads "A<n>\n" lines on its
// serial port and persists the acceleration sensitivity. Native (Tauri) has no
// Web Serial; this module is a no-op there (see `serialSupported`).

const { autopilot } = DEVICES
const VID = Number.parseInt(autopilot.vid, 16)
const PID = Number.parseInt(autopilot.pid, 16)

let port: SerialPort | null = null

// The Micro's USB-CDC OUT endpoint is not ready the instant the port opens — a
// write fired immediately after `open()` is silently dropped by the device, so the
// first config line never lands and the slider appears to do nothing. We settle
// once after opening (the port then stays open for the session, so later writes are
// fine). One-time and off the slider's debounce, so the latency is invisible.
const OPEN_SETTLE_MS = 250
const settle = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Whether Web Serial is available (Chromium browsers). */
export const serialSupported = () => typeof navigator !== 'undefined' && 'serial' in navigator

/** Whether a config port is currently open. */
export const configConnected = () => port !== null

const isPanel = (p: SerialPort) => {
  const info = p.getInfo()
  return info.usbVendorId === VID && info.usbProductId === PID
}

async function open(p: SerialPort): Promise<boolean> {
  try {
    await p.open({ baudRate: 115200 }) // CDC ignores the rate, but it's required
    await settle(OPEN_SETTLE_MS) // let the Micro's CDC OUT endpoint come up before any write
    port = p
    return true
  } catch {
    return false // already open elsewhere, or no longer present
  }
}

/**
 * Reopen an already-granted panel port without prompting (call on load). Returns
 * true if a config port is open afterwards.
 */
export async function reconnectConfigPort(): Promise<boolean> {
  const serial = navigator.serial
  if (!serial) return false
  if (port) return true
  const match = (await serial.getPorts()).find(isPanel)
  return match ? open(match) : false
}

/**
 * Prompt the user to pick the panel's serial port. MUST be called from a user
 * gesture. After a grant the port is reopened automatically on later loads.
 */
export async function connectConfigPort(): Promise<boolean> {
  const serial = navigator.serial
  if (!serial) return false
  if (port) return true
  const p = await serial.requestPort({
    filters: [{ usbVendorId: VID, usbProductId: PID }],
  })
  return open(p)
}

/** Send encoder `index`'s acceleration sensitivity (0..255) to the firmware. */
export async function sendAcceleration(index: number, value: number): Promise<boolean> {
  if (!port?.writable) return false
  const v = Math.max(0, Math.min(255, Math.round(value)))
  const writer = port.writable.getWriter()
  try {
    await writer.write(new TextEncoder().encode(`A${index}${v}\n`))
    return true
  } catch {
    return false
  } finally {
    writer.releaseLock()
  }
}
