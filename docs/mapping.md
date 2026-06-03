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

The Arduino sketch (`Joystick.setButton`) assigns indices in this order:
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

## Current test setup (1 encoder, no switches)

With only ENC1 connected on pins A0 (A), A1 (B), A2 (push):

| Action | `buttons[n]` | Shown in UI |
|---|---|---|
| Rotate CW | `buttons[0]` | ENC1 `▶` arrow pulses |
| Rotate CCW | `buttons[1]` | ENC1 `◀` arrow pulses |
| Press shaft | `buttons[2]` | ENC1 dot lights up |

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
