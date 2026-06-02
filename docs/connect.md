# Connecting the ESP32 Autopilot Panel

## How the browser talks to the ESP32

The app uses the browser's built-in **Web Gamepad API** (`navigator.getGamepads()`). No library or driver install required.

When the ESP32 connects over USB and identifies itself as a HID Gamepad, Windows registers it as a standard game controller. The browser exposes it automatically.

```
ESP32 firmware       →  USBHIDGamepad.pressButton(n)
Windows HID driver   →  registers as generic gamepad
Browser              →  navigator.getGamepads()[0].buttons[n].pressed
useGamepad.ts        →  polls every ~16ms via requestAnimationFrame
```

> **First-press quirk:** The browser won't expose the gamepad until the user has pressed at least one button — this is a browser security policy to prevent fingerprinting. After that first interaction it works continuously. This is why the UI shows "AWAITING DEVICE" until you press a button or turn a knob.

---

## Identifying the correct controller

If you have multiple controllers connected (Xbox pad, joystick, etc.) the app must pick the right one. Every gamepad has an `id` string exposed by the Gamepad API:

```
"ESP32 USB HID Gamepad (Vendor: 303a Product: 4004)"
```

### Step 1 — find your ESP32's id

Open the browser console while the panel is plugged in and run:

```js
navigator.getGamepads()
```

Each entry shows its full `id`. Find the one that belongs to the ESP32.

### Step 2 — set a stable VID/PID in firmware

The default VID/PID may clash with other ESP32 projects. Set a custom identity in the firmware **before** `USB.begin()`:

```cpp
USB.productName("NOBSFS Autopilot");
USB.manufacturerName("NobsFS");
USB.PID(0xA001);  // any value not already taken
USB.begin();
```

Flash this once and the device will always announce itself with this name and PID.

### Step 3 — filter by name in the app

In `useGamepad.ts`, replace the first-gamepad logic with a name match:

```ts
const gp = Array.from(gps).find(g => g?.id.includes('NOBSFS Autopilot')) ?? null
```

Or match by PID if you prefer (more robust, name-independent):

```ts
const gp = Array.from(gps).find(g => g?.id.includes('a001')) ?? null
```

---

## Communication direction

The Gamepad API is **read-only**. The app can read button states but cannot write anything back to the device.

If two-way communication is ever needed (e.g. sending config or LED states to the panel), the options are:

| API | How | Pros | Cons |
|---|---|---|---|
| **WebSerial** | Read/write over the ESP32's USB-CDC serial port (already enabled with `USB CDC On Boot: Enabled`) | Simple, well documented | Chrome/Edge only; user must pick the port once |
| **WebHID** | Direct HID report communication | No serial port needed | More complex; requires custom HID report descriptors in firmware; Chrome/Edge only |

For the current monitoring use case the Gamepad API is sufficient.
