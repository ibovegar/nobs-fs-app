// ── Nobs Windy — hardware definition + serial protocol ───────────────────────
// Windy is the odd one out in the Nobs family: an Arduino Uno Rev3 with a Motor
// Shield Rev3 driving two fans over PWM, plus 3 push buttons (fan ON/OFF, speed
// up, speed down). It has **no HID interface at all**, so none of the gamepad
// machinery in ./panel applies to it — no DeviceConfig, no DeviceDriver, no
// button snapshots. Everything travels over USB-CDC serial as one ASCII line per
// message, in *both* directions (see nobs-fs-windy/docs/serial-protocol.md):
//
//   host → device   GET_ID, SET_ID, GET_STATE, SET_POWER, SET_SPEED
//   device → host   STATE:<ON|OFF>:<level>  — replies *and* unsolicited pushes
//
// The unsolicited pushes are the only way the app learns that someone pressed a
// physical button, since there is no HID report to read.

/**
 * USB identity of a bare Arduino Uno Rev3 — what *every* Windy looks like on the
 * bus. Unlike the ESP32 products, this is not per-unit: the Uno's VID/PID is
 * burned into its separate 16U2 USB chip and the sketch cannot rewrite it.
 */
export const WINDY_USB_VID = 0x2341
export const WINDY_USB_PID = 0x0043

/**
 * Windy's logical id block (80FC–80FF), following the same per-product block
 * convention as the HID modules. This is bookkeeping only: `SET_ID` stores it in
 * EEPROM so the app can name a unit and tell several apart, but the OS always
 * sees WINDY_USB_VID/WINDY_USB_PID regardless of what is stored.
 */
export const WINDY_ID_BASE = 0x80fc
export const WINDY_MAX_INSTANCES = 4

export const WINDY_NAME = 'Nobs Windy'

// Five discrete PWM levels. "Off" is level-independent: the firmware keeps the
// stored level while the fans are off and restores it when they come back on.
export const WINDY_MIN_LEVEL = 1
export const WINDY_MAX_LEVEL = 5
export const WINDY_LEVELS = [1, 2, 3, 4, 5] as const

export type WindyPower = 'ON' | 'OFF'

/** The device's full runtime state — everything STATE: carries. */
export interface WindyState {
  power: WindyPower
  level: number
}

/** The stored logical identity — what GET_ID/SET_ID read and write. */
export interface WindyIdentity {
  /** 4-digit lowercase hex, e.g. "80fc". */
  id: string
  name: string
}

/** Clamp a speed to the firmware's 1–5 range (it clamps too; this keeps the UI honest). */
export const clampWindyLevel = (level: number) =>
  Math.max(WINDY_MIN_LEVEL, Math.min(WINDY_MAX_LEVEL, Math.round(level) || WINDY_MIN_LEVEL))

/** Logical id of the nth unit, as the 4-hex string the protocol uses. */
export const windyIdFor = (instance: number) =>
  (WINDY_ID_BASE + Math.max(1, Math.min(WINDY_MAX_INSTANCES, instance)) - 1)
    .toString(16)
    .padStart(4, '0')

/** Display name of the nth unit — unit 1 keeps the bare product name. */
export const windyNameFor = (instance: number) =>
  instance <= 1 ? WINDY_NAME : `${WINDY_NAME} ${instance}`

/** The 1-based unit number a logical id belongs to, or null if outside the block. */
export function windyInstanceOf(id: string): number | null {
  const n = Number.parseInt(id, 16)
  if (Number.isNaN(n)) return null
  const instance = n - WINDY_ID_BASE + 1
  return instance >= 1 && instance <= WINDY_MAX_INSTANCES ? instance : null
}

// ── Commands (host → device) ─────────────────────────────────────────────────
// Every command is one line terminated by \n. Kept here rather than inlined at
// the call sites so the wire format lives next to the parser that reads it back.

export const windyCommand = {
  getId: () => 'GET_ID\n',
  setId: (id: string, name: string) => `SET_ID:${id}:${name}\n`,
  getState: () => 'GET_STATE\n',
  setPower: (on: boolean) => `SET_POWER:${on ? 'ON' : 'OFF'}\n`,
  setSpeed: (level: number) => `SET_SPEED:${clampWindyLevel(level)}\n`,
}

// ── Replies + pushes (device → host) ─────────────────────────────────────────

export type WindyMessage =
  | { type: 'state'; state: WindyState }
  | { type: 'identity'; identity: WindyIdentity }
  | { type: 'error'; line: string }

/**
 * Parse one line from the device, or null if it isn't something we understand.
 *
 * `ID:` (a GET_ID reply) and `OK:` (a SET_ID acknowledgement) carry the same
 * payload and collapse to one `identity` message. The name is the *rest* of the
 * line rather than the third colon-separated field, so a name containing a colon
 * survives the round trip.
 */
export function parseWindyLine(line: string): WindyMessage | null {
  const text = line.trim()
  if (!text) return null

  if (text.startsWith('STATE:')) {
    const [power, level] = text.slice('STATE:'.length).split(':')
    if (power !== 'ON' && power !== 'OFF') return null
    const n = Number.parseInt(level, 10)
    return { type: 'state', state: { power, level: Number.isNaN(n) ? WINDY_MIN_LEVEL : n } }
  }

  for (const prefix of ['ID:', 'OK:']) {
    if (!text.startsWith(prefix)) continue
    const rest = text.slice(prefix.length)
    const split = rest.indexOf(':')
    if (split < 0) return null
    return {
      type: 'identity',
      identity: { id: rest.slice(0, split).toLowerCase(), name: rest.slice(split + 1) },
    }
  }

  if (text.startsWith('ERR:')) return { type: 'error', line: text.slice('ERR:'.length) }

  return null
}
