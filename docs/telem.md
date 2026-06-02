# Autopilot Panel Integration Guide: ESP32 Nano & MSFS 2024

This document outlines the architecture, hardware configuration, and software implementation for a custom Microsoft Flight Simulator 2024 (MSFS 2024) autopilot panel using an **Arduino ESP32 Nano** (ESP32-S3) operating as a native **USB HID Gamepad**.

This specific build supports **6 Rotary Encoders** (generating rapid increment/decrement button pulses) and **8 Tactile Pushbuttons**.

---

## System Architecture

*   **Input Layer:** [ 6 Encoders (12 Pins) + 8 Buttons (8 Pins) ]
*   **Processing Layer:** --- (GPIO Signals) ---> [ ESP32 Nano Controller ]
*   **Data Delivery:** --- (Native USB HID Packets) ---> [ Windows OS Stack ]
*   **Concurrent Clients:**
    *   ---> [ MSFS 2024 Engine (Control Settings Mapping) ]
    *   ---> [ React Desktop App Configuration Tool (.exe) ]

By leveraging Native USB HID, the system achieves:
* **Zero Background Latency**: Signals bypass intermediate bridge software.
* **Dual Monitoring**: Windows natively allows both MSFS 2024 and your React configuration tool to poll the device data packets simultaneously.
* **Native Binding**: Hardware inputs map directly in the MSFS 2024 Control Options menu like a commercial joystick.

## Microcontroller Firmware (C++)

This firmware turns your ESP32 Nano into a **20-Button Gamepad**:
* **Buttons 1 to 8:** The 8 standalone tactical pushbuttons.
* **Buttons 9 to 20:** The 6 encoders. Turning an encoder clockwise pulses an odd button; counter-clockwise pulses an even button.

Ensure **Tools > USB CDC On Boot** is set to **Enabled** in the Arduino IDE before flashing.

```cpp
#include "USB.h"
#include "USBHIDGamepad.h"

USBHIDGamepad Gamepad;

// --- Hardware Configuration ---
const int NUM_BUTTONS = 8;
const int NUM_ENCODERS = 6;

// Digital Input Pins for the 8 Buttons
const int buttonPins[NUM_BUTTONS] = {2, 3, 4, 5, 6, 7, 8, 9}; 
bool lastButtonStates[NUM_BUTTONS];

// Digital Input Pins for the 6 Encoders (Each takes 2 pins: A and B)
struct Encoder {
  int pinA;
  int pinB;
  int lastStateA;
  int hidBtnCW;  // Gamepad Button index for Clockwise turn
  int hidBtnCCW; // Gamepad Button index for Counter-Clockwise turn
};

Encoder encoders[NUM_ENCODERS] = {
  {10, 11, HIGH, 9,  10}, // Encoder 1 (e.g., HDG) -> HID Buttons 9 & 10
  {12, 13, HIGH, 11, 12}, // Encoder 2 (e.g., ALT) -> HID Buttons 11 & 12
  {14, 15, HIGH, 13, 14}, // Encoder 3 (e.g., VS)  -> HID Buttons 13 & 14
  {16, 17, HIGH, 15, 16}, // Encoder 4 (e.g., SPD) -> HID Buttons 15 & 16
  {18, 19, HIGH, 17, 18}, // Encoder 5 (e.g., CRS) -> HID Buttons 17 & 18
  {20, 21, HIGH, 19, 20}  // Encoder 6 (e.g., BARO)-> HID Buttons 19 & 20
};

void setup() {
  // Initialize Standalone Buttons
  for (int i = 0; i < NUM_BUTTONS; i++) {
    pinMode(buttonPins[i], INPUT_PULLUP);
    lastButtonStates[i] = HIGH;
  }

  // Initialize Encoders
  for (int i = 0; i < NUM_ENCODERS; i++) {
    pinMode(encoders[i].pinA, INPUT_PULLUP);
    pinMode(encoders[i].pinB, INPUT_PULLUP);
    encoders[i].lastStateA = digitalRead(encoders[i].pinA);
  }

  Gamepad.begin();
  USB.begin();
}

void loop() {
  // 1. Process 8 Standalone Buttons
  for (int i = 0; i < NUM_BUTTONS; i++) {
    bool currentState = digitalRead(buttonPins[i]);
    if (currentState != lastButtonStates[i]) {
      if (currentState == LOW) {
        Gamepad.pressButton(i + 1); // HID Buttons 1 to 8
      } else {
        Gamepad.releaseButton(i + 1);
      }
      lastButtonStates[i] = currentState;
      delay(10); // Simple debounce
    }
  }

  // 2. Process 6 Encoders (Quadrature Decoding)
  for (int i = 0; i < NUM_ENCODERS; i++) {
    int currentStateA = digitalRead(encoders[i].pinA);
    
    // Check if encoder dial has moved
    if (currentStateA != encoders[i].lastStateA && currentStateA == LOW) {
      // If Pin B is different from Pin A, encoder is moving Clockwise
      if (digitalRead(encoders[i].pinB) != currentStateA) {
        Gamepad.pressButton(encoders[i].hidBtnCW);
        delay(20); // Short pulse width for MSFS detection
        Gamepad.releaseButton(encoders[i].hidBtnCW);
      } 
      // Otherwise, encoder is moving Counter-Clockwise
      else {
        Gamepad.pressButton(encoders[i].hidBtnCCW);
        delay(20);
        Gamepad.releaseButton(encoders[i].hidBtnCCW);
      }
    }
    encoders[i].lastStateA = currentStateA;
  }
}
```

---

## Configuration App Frontend (React)

This component dynamically creates a 20-button dashboard layout mapping directly to your hardware layout (Buttons 1-8 for toggle actions, Buttons 9-20 showing encoder turn pulses).

```jsx
import React, { useState, useEffect, useRef } from 'react';

export default function HidConfigPanel() {
  const [isConnected, setIsConnected] = useState(false);
  const [buttonStates, setButtonStates] = useState([]);
  const requestRef = useRef();

  const pollGamepad = () => {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const activeGamepad = gamepads[0]; 

    if (activeGamepad) {
      const states = activeGamepad.buttons.map((btn) => btn.pressed);
      setButtonStates(states);
    }
    requestRef.current = requestAnimationFrame(pollGamepad);
  };

  useEffect(() => {
    const handleConnect = (e) => {
      setIsConnected(true);
      requestRef.current = requestAnimationFrame(pollGamepad);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      cancelAnimationFrame(requestRef.current);
    };

    window.addEventListener("gamepadconnected", handleConnect);
    window.addEventListener("gamepaddisconnected", handleDisconnect);

    return () => {
      window.removeEventListener("gamepadconnected", handleConnect);
      window.removeEventListener("gamepaddisconnected", handleDisconnect);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div style={{ padding: '30px', fontFamily: 'system-ui, sans-serif', background: '#121212', color: '#fff', minHeight: '100vh' }}>
      <h2>Autopilot Hardware Panel Monitor</h2>
      <p>Status: {isConnected ? "🟢 Live" : "🔴 Panel Asleep (Press a button/turn a knob to wake browser connection)"}</p>

      {isConnected && (
        <div>
          <h3>Push Buttons (Static Hold)</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
            {buttonStates.slice(0, 8).map((isPressed, index) => (
              <div key={index} style={{ padding: '15px', background: isPressed ? '#007ACC' : '#222', border: '1px solid #444', borderRadius: '4px' }}>
                Btn {index + 1}<br/>{isPressed ? "PRESSED" : "OPEN"}
              </div>
            ))}
          </div>

          <h3>Rotary Encoders (Pulse Clicks)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
            {[...Array(6)].map((_, i) => {
              const cwIdx = 8 + (i * 2);
              const ccwIdx = 9 + (i * 2);
              return (
                <div key={i} style={{ padding: '15px', background: '#1c1c1c', borderRadius: '6px', border: '1px solid #333' }}>
                  <strong>Encoder {i + 1}</strong>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <div style={{ flex: 1, padding: '10px', textAlign: 'center', background: buttonStates[cwIdx] ? '#00A2FF' : '#2a2a2a' }}>
                      CW (Btn {cwIdx + 1})
                    </div>
                    <div style={{ flex: 1, padding: '10px', textAlign: 'center', background: buttonStates[ccwIdx] ? '#00A2FF' : '#2a2a2a' }}>
                      CCW (Btn {ccwIdx + 1})
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

## Compiling to Standalone Executable (.exe)

### Option A: Tauri (Recommended - Lightweight)
Tauri compiles your code against the system's native Webview2 engine, yielding an optimized executable (~5-10MB).

1. **Scaffold Project**:
   Run: `npm create tauri-app@latest`
   *Select React and JavaScript/TypeScript when prompted.*

2. **Integrate UI Component**:
   Drop the React code block above into your project's `/src/App.jsx`.

3. **Compile the Executable**:
   Run: `npm run tauri build`
   *The standalone .exe will be located under src-tauri/target/release/bundle/msi/.*

### Option B: Electron (Chromium Embedded)
Electron ships with its own Chromium runtime, ensuring cross-platform predictability at the expense of storage footprint (~100MB+).

1. **Install Developer Dependencies**:
   Run: `npm install --save-dev electron electron-builder`

2. **Configure Packager**:
   Add a compilation script block inside your project's `package.json`:
   ```json
   "scripts": {
     "dist": "electron-builder --win"
   }
   ```

3. **Build the Binary**:
   Run: `npm run dist`

## 🎮 4. Binding Inputs Inside MSFS 2024

1. Connect the ESP32 Nano to your PC via a USB-C data cable.
2. Launch **MSFS 2024** and go to **Options > Control Options**.
3. Select your ESP32 Gamepad controller layout panel from the top menu carousel.
4. Set the left filter layout to **All**.
5. Map your variables:
    * Search for **Heading Bug - Increase**, select it, and turn Encoder 1 Clockwise. MSFS will automatically bind **Joystick Button 9**.
    * Search for **Heading Bug - Decrease**, select it, and turn Encoder 1 Counter-Clockwise. MSFS will bind **Joystick Button 10**.
    * Repeat this logic pattern across all remaining autopilot modes (Altitude, Vertical Speed, Speed) and assign your 8 primary toggle buttons.
6. Save and validate your input configuration matrix profile.