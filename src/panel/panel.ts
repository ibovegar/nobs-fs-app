// ── Hardware definition ──────────────────────────────────────────────────────
// Single source of truth for the ESP32 HID gamepad button mapping.
//
// Firmware layout (Arduino sketch, Joystick.setButton):
//   Each encoder occupies 3 consecutive buttons: CW, CCW, push
//   Standalone switches follow after all encoders
//
//   buttons[enc * 3 + 0]                    → encoder CW
//   buttons[enc * 3 + 1]                    → encoder CCW
//   buttons[enc * 3 + 2]                    → encoder push button
//   buttons[NUM_ENCODERS * 3 + sw]          → standalone switch

export const NUM_SWITCHES = 8
export const NUM_ENCODERS = 4
export const BUTTONS_PER_ENCODER = 3 // CW, CCW, push
export const BUTTON_COUNT = NUM_ENCODERS * BUTTONS_PER_ENCODER + NUM_SWITCHES

export const ENCODER_LABELS = ['ENC1', 'ENC2', 'ENC3', 'ENC4'] as const

// ── Device registry ──────────────────────────────────────────────────────────
// Every Nobs product is its own USB HID gamepad. The Gamepad API exposes the USB
// identity as "... (Vendor: <vid> Product: <pid>)"; `useGamepad` matches on those.
export interface DeviceConfig {
  name: string
  vid: string
  pid: string
  buttonCount: number
}

export const DEVICES = {
  // Real hardware — vid/pid must match the firmware build.opt (0x2341 / 0x0657).
  autopilot: { name: 'Nobs Autopilot', vid: '2341', pid: '0657', buttonCount: BUTTON_COUNT },
  // Imaginary identities — placeholders until the hardware exists.
  // Approach: 3 controls × 2 buttons. Panel: 6 ON-ON toggles (1 button) + 2
  // ON-OFF-ON toggles (2 buttons) = 10.
  approach: { name: 'Nobs Approach', vid: 'f110', pid: '0a01', buttonCount: 6 },
  panel: { name: 'Nobs Panel', vid: 'f110', pid: '0a02', buttonCount: 10 },
} satisfies Record<string, DeviceConfig>

/** HID button index for an encoder's clockwise pulse. */
export const cwButton = (enc: number) => enc * BUTTONS_PER_ENCODER
/** HID button index for an encoder's counter-clockwise pulse. */
export const ccwButton = (enc: number) => enc * BUTTONS_PER_ENCODER + 1
/** HID button index for an encoder's push button. */
export const pushButton = (enc: number) => enc * BUTTONS_PER_ENCODER + 2
/** HID button index for a standalone switch. */
export const switchButton = (sw: number) => NUM_ENCODERS * BUTTONS_PER_ENCODER + sw

// ── Runtime state of a single button ─────────────────────────────────────────
export interface ButtonState {
  pressed: boolean
  lastPress: number
  count: number
}

// ── Button-index decoding ────────────────────────────────────────────────────
export type DecodedButton =
  | { kind: 'switch'; index: number }
  | { kind: 'encoder'; index: number; dir: 'cw' | 'ccw' }
  | { kind: 'encoder-push'; index: number }

/** Decode a raw HID button index into its logical control. */
export function decodeButton(id: number): DecodedButton {
  const encoderEnd = NUM_ENCODERS * BUTTONS_PER_ENCODER
  if (id >= encoderEnd) return { kind: 'switch', index: id - encoderEnd }
  const enc = Math.floor(id / BUTTONS_PER_ENCODER)
  const offset = id % BUTTONS_PER_ENCODER
  if (offset === 2) return { kind: 'encoder-push', index: enc }
  return { kind: 'encoder', index: enc, dir: offset === 0 ? 'cw' : 'ccw' }
}

// ── Physical front-panel layout — 6 columns × 2 rows ─────────────────────────
export type PanelCell = { kind: 'switch'; index: number } | { kind: 'encoder'; index: number }

export const PANEL_LAYOUT: PanelCell[] = [
  // Row 1: all switches (SW4 sits in row 2; tail reads SW5 · SW6 · SW7)
  { kind: 'switch', index: 0 },
  { kind: 'switch', index: 1 },
  { kind: 'switch', index: 2 },
  { kind: 'switch', index: 4 },
  { kind: 'switch', index: 5 },
  { kind: 'switch', index: 6 },
  // Row 2: enc · enc · sw · enc · enc · sw
  { kind: 'encoder', index: 0 },
  { kind: 'encoder', index: 1 },
  { kind: 'switch', index: 3 },
  { kind: 'encoder', index: 2 },
  { kind: 'encoder', index: 3 },
  { kind: 'switch', index: 7 },
]
