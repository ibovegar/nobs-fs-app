# Connecting the Autopilot Panel (Web Gamepad path)

This describes the **web** input path, used when running the app in a browser (`pnpm dev`): the
development target. The shipping app is the native desktop build, which reads the panel directly
via the HID driver (`src-tauri/src/hid.rs`) and ignores everything below.

## How the browser talks to the panel

The app uses the browser's built-in **Web Gamepad API** (`navigator.getGamepads()`). No library or driver install required.

When the panel connects over USB and identifies itself as a HID Gamepad, Windows registers it as a standard game controller. The browser exposes it automatically.

```
Panel firmware       →  Joystick.setButton(n, …)
Windows HID driver   →  registers as generic gamepad
Browser              →  navigator.getGamepads()[0].buttons[n].pressed
useGamepad.ts        →  polls every ~16ms via requestAnimationFrame
```

> **First-press quirk:** The browser won't expose the gamepad until the user has pressed at least one button, due to a browser security policy to prevent fingerprinting. After that first interaction it works continuously. This is why the UI shows "AWAITING DEVICE" until you press a button or turn a knob.

## Identifying the correct controller

If you have multiple controllers connected (Xbox pad, joystick, etc.) the app must pick the right one. Every gamepad has an `id` string exposed by the Gamepad API:

```
"Nobs Autopilot USB HID Gamepad (Vendor: 2341 Product: 0657)"
```

### Step 1: find your panel's id

Open the browser console while the panel is plugged in and run:

```js
navigator.getGamepads()
```

Each entry shows its full `id`. Find the one that belongs to the panel.

### Step 2: VID/PID (Arduino board defaults)

The firmware sets a custom identity via `build.opt`:

```
vid=0x2341
pid=0x0657
```

The browser will see the device as: `"... (Vendor: 2341 Product: 0657)"`.

### Step 3: filter by VID/PID in the app (already implemented)

`useGamepad.ts` already filters by `DEVICE_VID` / `DEVICE_PID` from `~/panel`:

```ts
// src/panel/panel.ts
export const DEVICE_VID = '2341'
export const DEVICE_PID = '0657'

// src/hooks/useGamepad.ts
const gp =
  Array.from(gps).find((g) => g?.id.includes(DEVICE_VID) && g.id.includes(DEVICE_PID)) ?? null
```

If the VID/PID changes in firmware, update `DEVICE_VID`/`DEVICE_PID` in `src/panel/panel.ts`.

## Communication direction

The Gamepad API is **read-only**. The app can read button states but cannot write anything back to the device.

If two-way communication is ever needed (e.g. sending config or LED states to the panel), the options are:

| API | How | Pros | Cons |
|---|---|---|---|
| **WebSerial** | Read/write over the board's USB-CDC serial port (already enabled with `USB CDC On Boot: Enabled`) | Simple, well documented | Chrome/Edge only; user must pick the port once |
| **WebHID** | Direct HID report communication | No serial port needed | More complex; requires custom HID report descriptors in firmware; Chrome/Edge only |

For the current monitoring use case the Gamepad API is sufficient.
