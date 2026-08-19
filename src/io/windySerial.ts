import { WINDY_USB_PID, WINDY_USB_VID } from '~/panel'

// ── Windy serial link (Web Serial) ───────────────────────────────────────────
// Windy has no HID interface, so this port carries everything — commands out and
// state pushes in. That makes it different from `configSerial`, the autopilot's
// write-only, fire-and-forget config channel: here the port stays open for the
// session and a read loop runs behind it, turning the byte stream into lines.
//
// Native (Tauri/WebView2) has no Web Serial; `windyNative` is the counterpart and
// `windy.ts` picks between them.

const listeners = new Set<(line: string) => void>()
const connectionListeners = new Set<(connected: boolean) => void>()

let port: SerialPort | null = null
let connected = false
let reading = false
// The in-flight read loop and its reader, so `disconnectWindy` can wind them down
// deterministically before closing the port (a locked stream refuses to close).
let readTask: Promise<void> | null = null
let activeReader: ReadableStreamDefaultReader<Uint8Array> | null = null
// Set by an explicit disconnect: stops the replug watcher from grabbing the port
// straight back, which would defeat the point of having released it.
let suspended = false
// Why the last connect attempt failed, for the UI to show. Silent `false` returns
// left the user with a Connect button that did nothing and said nothing.
let lastError: string | null = null

/** Why the last connect attempt failed, or null if none has. */
export const windyError = () => lastError

/**
 * Opening the port asserts DTR, which pulls the Uno's auto-reset line and drops
 * it into the bootloader — the sketch is not listening again for roughly two
 * seconds. Anything written before that is lost to a board that is still booting,
 * so we hold off after `open()` until it is back. (The ESP32 products don't do
 * this; see `configSerial`'s much shorter CDC settle.)
 */
const UNO_RESET_MS = 2000
const settle = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function setConnected(next: boolean) {
  if (connected === next) return
  connected = next
  for (const l of connectionListeners) l(next)
}

function emitLine(line: string) {
  for (const l of listeners) l(line)
}

/** Whether Web Serial exists at all (Chromium browsers). */
export const windySupported = () => typeof navigator !== 'undefined' && 'serial' in navigator

/** Whether the link is open right now. */
export const windyConnected = () => connected

// The port the user granted last time, remembered by USB ids so a reload can
// reopen it without prompting. Needed because Windy has no distinguishing USB
// identity of its own (see the picker note on `connectWindy`) — a clone board
// with a CH340 or FTDI bridge is still a perfectly good Windy, and we would
// otherwise fail to recognise the very port the user just picked.
const GRANTED_KEY = 'nobs.windy.port'

interface PortIds {
  usbVendorId?: number
  usbProductId?: number
}

function rememberPort(p: SerialPort) {
  try {
    const { usbVendorId, usbProductId } = p.getInfo()
    localStorage.setItem(GRANTED_KEY, JSON.stringify({ usbVendorId, usbProductId }))
  } catch {
    // Storage unavailable (private mode) — reconnect falls back to the stock ids.
  }
}

function rememberedPort(): PortIds | null {
  try {
    const raw = localStorage.getItem(GRANTED_KEY)
    return raw ? (JSON.parse(raw) as PortIds) : null
  } catch {
    return null
  }
}

/** A granted port worth reopening: the stock Uno identity, or whatever was granted before. */
function isWindy(p: SerialPort) {
  const info = p.getInfo()
  if (info.usbVendorId === WINDY_USB_VID && info.usbProductId === WINDY_USB_PID) return true
  const saved = rememberedPort()
  return (
    saved !== null &&
    info.usbVendorId === saved.usbVendorId &&
    info.usbProductId === saved.usbProductId
  )
}

/**
 * Drain the port, splitting the byte stream into `\n`-terminated lines. Runs for
 * as long as the port stays readable; when it ends (unplug, or `close()`), the
 * link is marked disconnected.
 */
async function readLoop(p: SerialPort) {
  reading = true
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (p.readable) {
      const reader = p.readable.getReader()
      activeReader = reader
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) return
          buffer += decoder.decode(value, { stream: true })
          // A read can deliver several lines at once, or half of one — only
          // complete lines are emitted; the tail stays buffered for the next read.
          let nl = buffer.indexOf('\n')
          while (nl >= 0) {
            const line = buffer.slice(0, nl).trim()
            buffer = buffer.slice(nl + 1)
            if (line) emitLine(line)
            nl = buffer.indexOf('\n')
          }
        }
      } catch {
        return // device went away mid-read
      } finally {
        activeReader = null
        reader.releaseLock()
      }
    }
  } finally {
    reading = false
    if (port === p) port = null
    setConnected(false)
  }
}

async function open(p: SerialPort): Promise<boolean> {
  try {
    await p.open({ baudRate: 115200 }) // CDC ignores the rate; required by the API
  } catch (err) {
    // Overwhelmingly this is the port being held by something else — the Arduino
    // IDE's Serial Monitor is the usual culprit, and only one process can own a
    // COM port. Say so; a bare `false` here was invisible to the user.
    const reason = err instanceof Error ? err.message : String(err)
    lastError = `Could not open the port: ${reason}. Close the Arduino IDE's Serial Monitor (or anything else using it) and try again.`
    return false
  }

  lastError = null
  suspended = false
  await settle(UNO_RESET_MS) // wait out the DTR-triggered board reset
  port = p
  setConnected(true)
  if (!reading) readTask = readLoop(p)
  return true
}

/**
 * Close the port and let go of it, until the user asks to connect again.
 *
 * Windows hands a COM port to one process at a time, so while this link is open
 * nothing else can have it — including avrdude. Flashing new firmware from the
 * Arduino IDE fails with "Access is denied" until the app releases the port, and
 * closing the whole app to upload is a miserable loop to be stuck in.
 *
 * Order matters: cancelling the reader ends the read loop, and only once that has
 * run its course is the stream unlocked enough for `close()` to be accepted.
 */
export async function disconnectWindy(): Promise<void> {
  const p = port
  suspended = true // don't let the replug watcher immediately re-take it
  if (!p) return

  try {
    await activeReader?.cancel()
  } catch {
    // Already torn down — the close below is what actually matters.
  }
  try {
    await readTask // readLoop's finally clears `port` and reports the link down
  } catch {
    // The loop never throws, but never let a rejection skip the close.
  }
  try {
    await p.close()
  } catch {
    // Already closed, or the device is gone; either way we no longer hold it.
  }

  readTask = null
  port = null
  setConnected(false)
}

let watchingPorts = false

/**
 * Recover the link by itself after a replug. An already-granted port that comes
 * back fires `connect` on `navigator.serial`; without this the read loop would
 * have ended at the unplug and nothing would reopen it until a reload. The
 * native watcher reconnects on its own, so this keeps the two behaving alike.
 */
function watchPortChanges() {
  const serial = navigator.serial
  if (!serial || watchingPorts) return
  watchingPorts = true
  serial.addEventListener('connect', (event) => {
    // `suspended` means the user deliberately released the port (to flash firmware,
    // typically). A board re-enumerating mid-upload fires this event, so without
    // the guard we would snatch the port back and break the very upload they
    // disconnected for.
    if (suspended) return
    const candidate = (event as Event & { target: SerialPort | null }).target
    if (!port && candidate && isWindy(candidate)) void open(candidate)
  })
}

/** Reopen an already-granted Windy port without prompting (safe to call on load). */
export async function reconnectWindy(): Promise<boolean> {
  const serial = navigator.serial
  if (!serial) return false
  watchPortChanges()
  if (port) return true
  // A deliberate disconnect stays in force until the user connects again, so a
  // re-render or a remount can't silently re-take a port they wanted free.
  if (suspended) return false
  const match = (await serial.getPorts()).find(isWindy)
  return match ? open(match) : false
}

/**
 * Prompt the user to pick Windy's serial port. MUST be called from a user
 * gesture. After a grant the port reopens automatically on later loads.
 *
 * Deliberately **unfiltered**. Filtering on the stock Uno identity
 * (WINDY_USB_VID/PID) looked tidy but broke the feature outright: plenty of Uno
 * boards present a different USB bridge — CH340 clones, FTDI, `2341:0001` — and
 * Chrome gives the user no way to see past a filter, so the picker came up empty
 * and clicking Connect appeared to do nothing at all.
 *
 * Nor can a filter be made correct: Windy's real identity lives in EEPROM and is
 * only readable *over* the link (GET_ID), never in the USB descriptor. So the
 * board is identified by the protocol handshake once the port is open — the user
 * picks the port, and the module confirms what it is by answering.
 */
export async function connectWindy(): Promise<boolean> {
  const serial = navigator.serial
  if (!serial) {
    lastError = 'Web Serial is unavailable — use Chrome or Edge, or the desktop app.'
    return false
  }
  if (port) return true

  let picked: SerialPort | null = null
  try {
    picked = await serial.requestPort()
  } catch {
    // The user dismissed the picker, or it had nothing to offer.
    lastError = 'No port was selected. Plug Windy in, then pick its COM port.'
    return false
  }

  rememberPort(picked)
  return open(picked)
}

async function writeOne(line: string): Promise<boolean> {
  if (!port?.writable) return false
  let writer: WritableStreamDefaultWriter<Uint8Array>
  try {
    writer = port.writable.getWriter()
  } catch {
    return false // stream locked or torn down
  }
  try {
    await writer.write(new TextEncoder().encode(line))
    return true
  } catch {
    return false
  } finally {
    writer.releaseLock()
  }
}

// A WritableStream can only hand out one writer at a time — `getWriter()` throws
// while a previous one still holds the lock. Commands are fired without awaiting
// (two on connect, and one per click of the speed controls), so back-to-back
// calls would otherwise collide and silently drop a line. Chaining them keeps
// every write on the wire, in order.
let writeChain: Promise<unknown> = Promise.resolve()

/** Write one already-terminated command line. Returns false if the link is down. */
export function sendWindy(line: string): Promise<boolean> {
  const done = writeChain.then(() => writeOne(line))
  writeChain = done.catch(() => false) // one failure must not poison the chain
  return done
}

/** Subscribe to raw lines from the device. Returns an unsubscribe function. */
export function onWindyLine(cb: (line: string) => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/**
 * Subscribe to link up/down. Returns an unsubscribe function.
 *
 * A subscriber that arrives while the link is *already* up is primed with it
 * immediately: the port outlives any one subscription (it stays open for the
 * session), so a later listener — React StrictMode's second effect pass, or a
 * remount — would otherwise wait forever for an edge that already happened.
 */
export function onWindyConnection(cb: (isConnected: boolean) => void) {
  connectionListeners.add(cb)
  if (connected) cb(true)
  return () => {
    connectionListeners.delete(cb)
  }
}
