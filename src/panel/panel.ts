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
// identity as "... (Vendor: <vid> Product: <pid>)"; the drivers match on those.
//
// Multiple physical modules of the same type are supported: each product reserves a
// contiguous block of PIDs, one per instance. Instance 1 keeps the bare product name
// and the block's base PID; instances 2+ get the next PID and a numbered name. A
// board is moved onto a given instance's PID/name with the firmware's SET_ID command
// (see nobs-fs-panel/docs/board-identity.md). Every Nobs box shares Espressif's
// vendor ID (0x303A); the per-instance vid/pid here must match the firmware.
export type DeviceKind = 'autopilot' | 'approach' | 'panel'

export interface DeviceConfig {
  /** Stable per-instance id, e.g. "panel-2". */
  key: string
  kind: DeviceKind
  /** 1-based module number within the product. */
  instance: number
  name: string
  vid: string
  pid: string
  buttonCount: number
}

/** Max physical modules of each product the app tracks (size of each PID block). */
export const MAX_INSTANCES = 4

interface Product {
  kind: DeviceKind
  name: string
  vid: string
  /** PID of instance 1; instance n uses pidBase + (n - 1). */
  pidBase: number
  buttonCount: number
}

// PID blocks: panel 80F0–80F3, autopilot 80F4–80F7, approach 80F8–80FB.
const PRODUCTS: Record<DeviceKind, Product> = {
  panel: { kind: 'panel', name: 'Nobs Panel', vid: '303a', pidBase: 0x80f0, buttonCount: 16 },
  autopilot: {
    kind: 'autopilot',
    name: 'Nobs Autopilot',
    vid: '303a',
    pidBase: 0x80f4,
    buttonCount: BUTTON_COUNT,
  },
  approach: {
    kind: 'approach',
    name: 'Nobs Approach',
    vid: '303a',
    pidBase: 0x80f8,
    buttonCount: 6,
  },
}

function instanceConfig(kind: DeviceKind, instance: number): DeviceConfig {
  const p = PRODUCTS[kind]
  return {
    key: `${kind}-${instance}`,
    kind,
    instance,
    name: instance === 1 ? p.name : `${p.name} ${instance}`,
    vid: p.vid,
    pid: (p.pidBase + instance - 1).toString(16).padStart(4, '0'),
    buttonCount: p.buttonCount,
  }
}

/** The display name of a product kind (instance 1's name). */
export const productName = (kind: DeviceKind) => PRODUCTS[kind].name

/** Configs for a specific set of instance numbers (each clamped to [1, MAX_INSTANCES]). */
export const instancesFor = (kind: DeviceKind, instances: number[]): DeviceConfig[] =>
  instances
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= MAX_INSTANCES)
    .map((n) => instanceConfig(kind, n))

/** Config for a single instance of a product (instance clamped to [1, MAX_INSTANCES]). */
export const deviceFor = (kind: DeviceKind, instance: number): DeviceConfig =>
  instanceConfig(kind, Math.max(1, Math.min(MAX_INSTANCES, instance)))

/** Instance-1 config of each product — default single-device references. */
export const DEVICES = {
  autopilot: instanceConfig('autopilot', 1),
  approach: instanceConfig('approach', 1),
  panel: instanceConfig('panel', 1),
} satisfies Record<DeviceKind, DeviceConfig>

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

// ── Nobs Panel product — toggle-switch mapping ───────────────────────────────
// The Nobs Panel is 8 toggle switches. Each is wired through both of its outer
// terminals, so it occupies a button PAIR: pin 1 (the "up" terminal, button 2i)
// and pin 3 (the "down" terminal, button 2i+1). SW1–SW6 are 2-position (ON-ON):
// exactly one terminal is closed at a time. SW7–SW8 are 3-position (ON-OFF-ON):
// the centre position closes neither. See nobs-fs-panel/docs/arduino-esp-32-wiring.md.
export const NOBS_PANEL_SWITCH_COUNT = 8

export type PanelSwitchKind = 'on-on' | 'on-off-on'
export interface PanelSwitch {
  index: number // 0-based switch number
  label: string // 'SW1'..'SW8'
  kind: PanelSwitchKind
  up: number // button index of pin 1 terminal (2i)
  down: number // button index of pin 3 terminal (2i+1)
}

export const PANEL_SWITCHES: PanelSwitch[] = Array.from(
  { length: NOBS_PANEL_SWITCH_COUNT },
  (_, i) => ({
    index: i,
    label: `SW${i + 1}`,
    kind: i >= 6 ? 'on-off-on' : 'on-on', // only SW7/SW8 have a centre rest
    up: i * 2,
    down: i * 2 + 1,
  }),
)

// Physical front-panel order, by switch index: row 1 reads SW2 · SW4 · SW6 · SW8,
// row 2 reads SW1 · SW3 · SW5 · SW7 (the 4-column grid wraps rows via CSS).
export const PANEL_SWITCH_ROWS: number[][] = [
  [1, 3, 5, 7],
  [0, 2, 4, 6],
]

export type PanelButtonEvent = { switchIndex: number; terminal: 'up' | 'down' }

/** Decode a Nobs Panel HID button index into its switch + which terminal it is. */
export const decodePanelButton = (id: number): PanelButtonEvent => ({
  switchIndex: Math.floor(id / 2),
  terminal: id % 2 === 0 ? 'up' : 'down',
})
