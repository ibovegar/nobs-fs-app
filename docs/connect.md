# Connecting to a Panel

How the app talks to a panel over USB, in each of the three environments it runs in. The app picks
the input driver at runtime (`src/io/selectDriver.ts`); the rest of the app (`useDevice`,
components, pages) is identical regardless of which one is active.

> **This app is a read-only observer, not part of the input path MSFS uses.** Every driver below
> only *reads* the panel's HID reports to display them; none of them write anything back or sit
> between the panel and the sim. MSFS binds the panel directly as a USB game controller, so it
> keeps working whether or not this app — or any driver below — is running at all.

| Environment | Driver | How it detects the panel |
|---|---|---|
| Native desktop (Tauri) | `nativeDriver.ts` | Rust HID bridge (`src-tauri/src/hid.rs`, `hidapi` crate) enumerates the USB bus directly — auto-detected, no interaction needed |
| Browser, Chromium (Chrome/Edge) | `webhidDriver.ts` | WebHID (`navigator.hid`) — auto-detected after a one-time permission grant (the Devices page's **Connect** button) |
| Browser, other (Firefox/Safari, no WebHID) | `gamepadDriver.ts` | Gamepad API (`navigator.getGamepads()`) — only appears after the user actuates a control once |

The native desktop build is the shipping app. The browser paths exist for development
(`pnpm dev`) and as a fallback where native isn't an option.

## Identifying a panel

Every Nobs panel shares one USB vendor ID and is told apart by product ID — a 4-PID block per
product, one PID per physical unit (assigned via the firmware's `SET_ID` command):

| Product | Vendor ID | Product ID block |
|---|---|---|
| Nobs Panel | `0x303A` | `0x80F0`–`0x80F3` |
| Nobs Autopilot | `0x303A` | `0x80F4`–`0x80F7` |
| Nobs Approach | `0x303A` | `0x80F8`–`0x80FB` |

This registry lives in one place, [`src/panel/panel.ts`](../src/panel/panel.ts) (`PRODUCTS`,
`DeviceConfig`, `identifyDevice`) — every driver reads from it rather than hardcoding an identity.

**Nobs Windy is not in that table, and cannot be.** It has no HID interface, so none of the drivers
above see it at all, and its USB identity is a generic Arduino Uno (`0x2341:0x0043`) shared by every
unit — the Uno's descriptor lives in a separate 16U2 chip its sketch can't rewrite. Its per-unit ID
(`0x80FC`–`0x80FF`) is therefore *logical*: stored in EEPROM and readable only over the open serial
link with `GET_ID`. The app cannot filter for it up front, so the user picks the port and the module
confirms itself by answering. Windy's definition and protocol codec live separately, in
[`src/panel/windy.ts`](../src/panel/windy.ts).

## WebHID path (Chromium)

`webhidDriver.ts` uses `navigator.hid`, which — unlike the Gamepad API — surfaces an already-
granted device on page load and reacts to `connect`/`disconnect` events, so no control needs to be
actuated first. The catch is a one-time permission grant: the user clicks **Connect** on the
Devices page (`requestHidDevices`, must run from a user gesture), picks their panel from the
browser's device chooser, and the grant then persists per-origin across reloads and replugs.

## Gamepad API path (fallback)

`gamepadDriver.ts` polls `navigator.getGamepads()` every animation frame and matches by substring
against the device's `id` string, e.g. `"... (Vendor: 303a Product: 80f4)"`:

```ts
// src/io/gamepadDriver.ts
const gp = Array.from(gamepads).find(
  (g) => g?.id.includes(device.vid) && g.id.includes(device.pid),
) ?? null
```

> **First-actuation quirk:** browsers won't expose a gamepad until the user has interacted with it
> at least once (an anti-fingerprinting policy), so this path needs a knob turn or switch flip
> before the panel appears — WebHID and native don't have this limitation.

## Communication direction

The HID input path (native, WebHID, and Gamepad API alike) is **read-only** — it reports button
state but can't write back to the panel. For the one case that needs two-way communication (the
Settings page's per-encoder acceleration sensitivity), the app uses a **separate serial channel**,
environment-aware via [`src/io/panelConfig.ts`](../src/io/panelConfig.ts):

- **Web**: Web Serial (`configSerial.ts`, Chromium only), one-time port grant opened within the
  user gesture of moving a slider.
- **Native**: Rust serial commands (`configNative.ts` → `src-tauri/src/serial.rs`, the
  `serialport` crate), which find the panel's CDC port by VID/PID — no grant needed.

Both send the same line protocol (`A<encoder><value>\n`, replying `A<encoder>=<value>\n`) to the
firmware, which persists the value in EEPROM.

### Nobs Windy: read *and* write, over serial only

Windy is the exception to all of the above. With no HID interface, its serial port carries
everything in both directions, and it stays open for the session rather than being opened per write:

- **Web**: Web Serial ([`src/io/windySerial.ts`](../src/io/windySerial.ts)) — a persistent port with
  a read loop turning the byte stream into lines.
- **Native**: a Rust worker thread ([`src-tauri/src/windy.rs`](../src-tauri/src/windy.rs)) holding
  the port open and emitting `windy://line` / `windy://connection`.

[`src/io/windy.ts`](../src/io/windy.ts) picks between them, and [`useWindy`](../src/hooks/useWindy.ts)
owns the single link. The firmware only prints `STATE:` when something *changes*, so the app probes
with `GET_STATE` on connect and retries until answered — opening the port also resets the Uno via
DTR, which can swallow the first attempt.

That DTR reset is worth knowing about generally: opening *or* closing the port reboots the board, so
Windy persists its fan state to EEPROM and restores it on boot. It keeps blowing whether or not the
app is connected. For the same reason the Devices page has a **Disconnect** button — Windows gives a
COM port to one owner, so the app must let go before the Arduino IDE can flash the board.
