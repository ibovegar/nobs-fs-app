# HID Button Mapping

Documents the relationship between physical hardware, Arduino firmware button indices,
and the React app's `~/panel` constants.

---

## Physical hardware

| Component | Count | Inputs per unit |
|---|---|---|
| Bourns PEC11 rotary encoder | 4 | CW pulse, CCW pulse, push button |
| Standalone momentary switch | 8 | press / release |
| **Total HID buttons** | | **20** |

---

## Firmware layout

Sketch: [`firmware/nobs-autopilot/nobs-autopilot.ino`](../firmware/nobs-autopilot/nobs-autopilot.ino)
(Arduino Micro / ATmega32U4, MHeironimus `Joystick` library, report ID `0x05`).

The sketch (`Joystick.setButton`) assigns indices in this order:
**encoders first** (3 buttons each), **standalone switches after**.

```
buttons[ 0] = ENC1 CW
buttons[ 1] = ENC1 CCW
buttons[ 2] = ENC1 push

buttons[ 3] = ENC2 CW
buttons[ 4] = ENC2 CCW
buttons[ 5] = ENC2 push

buttons[ 6] = ENC3 CW
buttons[ 7] = ENC3 CCW
buttons[ 8] = ENC3 push

buttons[ 9] = ENC4 CW
buttons[10] = ENC4 CCW
buttons[11] = ENC4 push

buttons[12] = SW1
buttons[13] = SW2
buttons[14] = SW3
buttons[15] = SW4
buttons[16] = SW5
buttons[17] = SW6
buttons[18] = SW7
buttons[19] = SW8
```

Formula:
```
CW    index = encoder_index × 3
CCW   index = encoder_index × 3 + 1
push  index = encoder_index × 3 + 2
SW    index = (NUM_ENCODERS × 3) + switch_index   →  4 × 3 + sw = 12 + sw
```

---

## Signal decoding (firmware behavior)

How the raw electrical signals become HID button presses:

| Input | Signal | HID behavior |
|---|---|---|
| Encoder rotation | Quadrature A/B | Momentary **pulse** per detent — queued, ~6 ms on + ~4 ms gap |
| Encoder push (S) | Single contact to GND | **Level** — pressed while held (LOW) |
| Switch | Single contact to GND | **Level** — pressed while closed (LOW) |

- **Quadrature decode.** Each loop reads both A and B and accumulates only valid
  Gray-code transitions via a 16-entry direction table (`qdec`). One detent = one
  full cycle = **4 counts** (`DETENT_STEPS`), so a CW/CCW step is emitted each time
  the accumulator crosses ±4. Contact bounce that wiggles back and forth, or any
  illegal two-bit jump, nets to zero — no false or jittery steps, in either
  direction, and it does not depend on which phase the detent rests at.
- **Queued pulses.** Each detent is emitted as a short press (`PULSE_ON_MS` ~6 ms)
  followed by a forced low gap (`PULSE_GAP_MS` ~4 ms), paced out from a per-encoder
  queue (`pending[]`). Earlier the button was held and re-armed, which merged into
  one long press during fast rotation and dropped counts; queuing makes every detent
  a distinct, countable press. Phases are short because WebHID delivers every report
  (~1 ms USB poll). Non-blocking (`millis()` based).
- **One report per loop.** The Joystick library's auto-send is disabled
  (`Joystick.begin(false)`); all 20 buttons are written each loop and pushed in a
  single `Joystick.sendState()`. Sending a report per `setButton()` (the default)
  slowed the loop enough to miss quadrature transitions.

> If a single physical detent ever registers as **two** steps, the encoder is
> half-step (2 transitions per detent) — set `DETENT_STEPS = 2`.

---

## App constants (`src/panel/panel.ts`)

```ts
export const NUM_ENCODERS       = 4
export const NUM_SWITCHES       = 8
export const BUTTONS_PER_ENCODER = 3   // CW, CCW, push
export const BUTTON_COUNT       = 20   // NUM_ENCODERS * 3 + NUM_SWITCHES

export const cwButton     = (enc: number) => enc * BUTTONS_PER_ENCODER
export const ccwButton    = (enc: number) => enc * BUTTONS_PER_ENCODER + 1
export const pushButton   = (enc: number) => enc * BUTTONS_PER_ENCODER + 2
export const switchButton = (sw:  number) => NUM_ENCODERS * BUTTONS_PER_ENCODER + sw
```

---

## Physical pin assignments (Arduino Micro)

Wiring convention — every signal pin uses the MCU's internal pull-up
(`INPUT_PULLUP`), so **no external resistors** are needed and a closed contact
reads `LOW`:

- **Encoders:** `A` and `B` → their MCU pins; `C` (common) → **GND**; `S` (push) →
  its MCU pin; the extra `W` pin → **GND**.
- **Switches:** pin 1 → its MCU pin; pin 2 → **GND**.

The AVR port pin is shown in parentheses next to the Arduino label.

### Encoders

| Encoder | A | B | Push (S) | Buttons (CW / CCW / push) |
|---|---|---|---|---|
| ENC1 | A0 (PF7) | A1 (PF6) | A2 (PF5) | 0 / 1 / 2 |
| ENC2 | A3 (PF4) | A4 (PF1) | A5 (PF0) | 3 / 4 / 5 |
| ENC3 | D3 (PD0) | D2 (PD1) | D4 (PD4) | 6 / 7 / 8 |
| ENC4 | D0 (PD2) | D1 (PD3) | D16 (PB2) | 9 / 10 / 11 |

### Switches

| Switch | Pin 1 → MCU | Button |
|---|---|---|
| SW1 | D12 (PD6) | 12 |
| SW2 | D11 (PB7) | 13 |
| SW3 | D10 (PB6) | 14 |
| SW4 | D9 (PB5) | 15 |
| SW5 | D8 (PB4) | 16 |
| SW6 | D7 (PE6) | 17 |
| SW7 | D6 (PD7) | 18 |
| SW8 | D5 (PC6) | 19 |

> Note: ENC4's push was moved off **PB0 (D17)** — that pin is the Micro's RX LED and
> is held LOW by the LED circuit, so it reads as permanently pressed. It now uses
> **PB2 (D16 / MOSI)**. For the same reason, avoid **PC7 (D13)** for inputs.

---

## Decoding in the app (`decodeButton`)

`App.tsx` calls `decodeButton(id)` on every gamepad event to turn a raw button index
into a typed logical control:

```ts
type DecodedButton =
  | { kind: 'switch';       index: number }
  | { kind: 'encoder';      index: number; dir: 'cw' | 'ccw' }
  | { kind: 'encoder-push'; index: number }
```

Event log output:

| Input | Log entry |
|---|---|
| ENC1 CW | `ENC1    ▶  CW` |
| ENC1 CCW | `ENC1    ◀  CCW` |
| ENC1 push | `ENC1    PUSH` |
| SW3 press | `SW 3    PRESSED` |
| SW3 release | `SW 3    RELEASED` |
