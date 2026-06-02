// ── Hardware definition ──────────────────────────────────────────────────────
// Single source of truth for the ESP32 HID gamepad button mapping.
// Buttons 0..NUM_SWITCHES-1     → momentary switches
// Buttons NUM_SWITCHES..end     → encoders, interleaved CW/CCW pairs

export const NUM_SWITCHES = 8
export const NUM_ENCODERS = 4
export const BUTTON_COUNT = NUM_SWITCHES + NUM_ENCODERS * 2

export const ENCODER_LABELS = ['ENC1', 'ENC2', 'ENC3', 'ENC4'] as const

/** HID button index for an encoder's clockwise pulse. */
export const cwButton = (enc: number) => NUM_SWITCHES + enc * 2
/** HID button index for an encoder's counter-clockwise pulse. */
export const ccwButton = (enc: number) => NUM_SWITCHES + enc * 2 + 1

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

/** Decode a raw HID button index into its logical control. */
export function decodeButton(id: number): DecodedButton {
  if (id < NUM_SWITCHES) return { kind: 'switch', index: id }
  const rel = id - NUM_SWITCHES
  return { kind: 'encoder', index: Math.floor(rel / 2), dir: rel % 2 === 0 ? 'cw' : 'ccw' }
}

// ── Physical front-panel layout — 6 columns × 2 rows ─────────────────────────
export type PanelCell =
  | { kind: 'switch'; index: number }
  | { kind: 'encoder'; index: number }

export const PANEL_LAYOUT: PanelCell[] = [
  // Row 1: all switches
  { kind: 'switch', index: 0 },
  { kind: 'switch', index: 1 },
  { kind: 'switch', index: 2 },
  { kind: 'switch', index: 3 },
  { kind: 'switch', index: 4 },
  { kind: 'switch', index: 5 },
  // Row 2: enc · enc · sw · enc · enc · sw
  { kind: 'encoder', index: 0 },
  { kind: 'encoder', index: 1 },
  { kind: 'switch',  index: 6 },
  { kind: 'encoder', index: 2 },
  { kind: 'encoder', index: 3 },
  { kind: 'switch',  index: 7 },
]
