#include <Joystick.h>

// Nobs Autopilot — Arduino Micro (ATmega32U4) USB HID gamepad firmware.
//
// Exposes 20 buttons in the exact order the nobs-fs app expects:
//   buttons  0..11  → 4 encoders × (CW, CCW, push)
//   buttons 12..19  → 8 standalone switches (SW1..SW8)
// See docs/mapping.md for the full button + pin table.

Joystick_ Joystick(0x05,
  JOYSTICK_TYPE_GAMEPAD,
  20, 0,                 // 20 buttons, 0 hat switches
  false, false, false,   // no analog axes (X, Y, Z)
  false, false, false,   //                (Rx, Ry, Rz)
  false, false,          //                (rudder, throttle)
  false, false, false);  //                (accelerator, brake, steering)

// ── Pin assignments (Arduino Micro labels) ───────────────────────────────────
// Encoders: A/B quadrature pins + S push button. Encoder common (C) and the
// extra W pin are wired to GND.
const uint8_t encA[4]    = { A0, A3, 3, 0 };   // PF7, PF4, PD0, PD2
const uint8_t encB[4]    = { A1, A4, 2, 1 };   // PF6, PF1, PD1, PD3
const uint8_t encPush[4] = { A2, A5, 4, 16 };  // PF5, PF0, PD4, PB2
//                                        ^ ENC4 push moved off PB0 (D17 = RX LED,
//                                          held low by the LED) onto PB2 (D16 / MOSI).

// Standalone switches SW1..SW8 (pin 1 to the MCU, pin 2 to GND).
const uint8_t swPin[8]   = { 12, 11, 10, 9, 8, 7, 6, 5 };
//                           PD6 PB7 PB6 PB5 PB4 PE6 PD7 PC6

// ── Button index map (must match docs/mapping.md / src/panel/panel.ts) ────────
const uint8_t encBase[4] = { 0, 3, 6, 9 }; // CW = base, CCW = base + 1, push = base + 2
const uint8_t swBase     = 12;

// ── Encoder rotation state ────────────────────────────────────────────────────
// Full quadrature decode: every loop read both A and B and accumulate only valid
// Gray-code transitions. Sampling B at a single A edge mis-read direction (CCW
// triggered false CW); here a bounce that jumps two bits, or wiggles back and
// forth, nets to zero — no false steps in either direction, and it doesn't care
// where the detent rests. One detent = one full cycle = 4 counts, so we emit a
// CW/CCW step each time the accumulator crosses ±DETENT_STEPS.
//
// Each detent becomes one momentary CW/CCW press. Steps are *queued* rather than
// held: a step held and re-armed (the old approach) merged into one long press
// when you spun fast, so rapid rotation lost counts. The generator emits each
// queued step as a short press (PULSE_ON_MS) followed by a forced low gap
// (PULSE_GAP_MS) so every detent is a distinct press the host can count. Phases
// are short because WebHID sees every report (~1 ms USB poll).
const int8_t        DETENT_STEPS  = 4; // quadrature counts per detent
const unsigned long PULSE_ON_MS   = 6; // CW/CCW button held high per step
const unsigned long PULSE_GAP_MS  = 4; // forced low gap between consecutive steps
const int8_t        STEP_QUEUE_MAX = 64; // clamp pending steps (overflow guard)

// Direction of each (prevAB << 2 | currAB) transition: +1 CW, -1 CCW, 0 none/invalid.
// Derived from the confirmed orientation: A-falling-with-B-high (11→01) is CW.
const int8_t qdec[16] = {
   0, -1,  1,  0,
   1,  0,  0, -1,
  -1,  0,  0,  1,
   0,  1, -1,  0,
};

uint8_t       prevAB[4];     // last (A<<1 | B) phase per encoder
int8_t        accum[4];      // accumulated quadrature counts toward a detent
int8_t        pending[4];    // queued steps not yet pulsed (signed: + CW, − CCW)
bool          pulseOn[4];    // is a CW/CCW press currently asserted?
int           pulseBtn[4];   // which button that press is on
unsigned long phaseUntil[4]; // millis() when the current on/gap phase ends

void setup() {
  for (uint8_t i = 0; i < 4; i++) {
    pinMode(encA[i], INPUT_PULLUP);
    pinMode(encB[i], INPUT_PULLUP);
    pinMode(encPush[i], INPUT_PULLUP);
    prevAB[i] = (digitalRead(encA[i]) << 1) | digitalRead(encB[i]);
    accum[i] = 0;
    pending[i] = 0;
    pulseOn[i] = false;
    pulseBtn[i] = -1;
    phaseUntil[i] = 0;
  }
  for (uint8_t i = 0; i < 8; i++) {
    pinMode(swPin[i], INPUT_PULLUP);
  }
  // Auto-send OFF: otherwise every setButton() blocks on its own USB report (~12
  // per loop), slowing the loop enough to miss quadrature transitions. We batch
  // all updates into one report per loop via sendState() instead.
  Joystick.begin(false);
}

void loop() {
  unsigned long now = millis();

  // ── Encoders ────────────────────────────────────────────────────────────────
  for (uint8_t i = 0; i < 4; i++) {
    // Accumulate valid quadrature transitions; emit a step each full detent.
    uint8_t ab = (digitalRead(encA[i]) << 1) | digitalRead(encB[i]);
    if (ab != prevAB[i]) {
      accum[i] += qdec[(prevAB[i] << 2) | ab];
      prevAB[i] = ab;

      int8_t dir = 0;
      if (accum[i] >= DETENT_STEPS) {
        dir = 1;            // clockwise  → CW
        accum[i] -= DETENT_STEPS;
      } else if (accum[i] <= -DETENT_STEPS) {
        dir = -1;           // counter-cw → CCW
        accum[i] += DETENT_STEPS;
      }

      // Queue the step instead of pulsing now; the generator below paces it out.
      if (dir > 0 && pending[i] < STEP_QUEUE_MAX) pending[i]++;
      else if (dir < 0 && pending[i] > -STEP_QUEUE_MAX) pending[i]--;
    }

    // Pulse generator: turn queued steps into distinct press/gap cycles so even
    // rapid rotation counts every detent.
    if (pulseOn[i]) {
      if (now >= phaseUntil[i]) {           // end the press → start the low gap
        Joystick.setButton(pulseBtn[i], 0);
        pulseOn[i] = false;
        phaseUntil[i] = now + PULSE_GAP_MS;
      }
    } else if (now >= phaseUntil[i] && pending[i] != 0) {
      int8_t dir = (pending[i] > 0) ? 1 : -1; // start the next queued press
      pending[i] -= dir;
      pulseBtn[i] = (dir > 0) ? encBase[i] : encBase[i] + 1;
      Joystick.setButton(pulseBtn[i], 1);
      pulseOn[i] = true;
      phaseUntil[i] = now + PULSE_ON_MS;
    }

    // Push button is reported as a held level (pressed = LOW with INPUT_PULLUP).
    Joystick.setButton(encBase[i] + 2, digitalRead(encPush[i]) == LOW ? 1 : 0);
  }

  // ── Standalone switches ───────────────────────────────────────────────────────
  for (uint8_t i = 0; i < 8; i++) {
    Joystick.setButton(swBase + i, digitalRead(swPin[i]) == LOW ? 1 : 0);
  }

  // One USB report per loop with all the updates above (auto-send is off).
  Joystick.sendState();
}
