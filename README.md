# nobs-fs-app

**Nobs FS** is a set of DIY flight-sim panels you build yourself on an Arduino: real knobs,
switches and push buttons for flying in Microsoft Flight Simulator. This app is the companion that
shows you what your panel is doing in real time: turn a knob or flip a switch and watch it light up
on screen.

Each panel plugs in over USB and pretends to be an ordinary game controller, so there's nothing
extra to install on the sim side: no plugins, no fiddly config. The app reads the raw button
presses and turns them back into the things you actually did: knob turns, button pushes, switch
flips.

The **native desktop app** (Windows) is the main event: install it, open it, and it finds your
panel on its own, no setup, nothing to click.

The same code also runs in the browser via `pnpm dev`, but that's really just for development. It
works as a fallback: Chrome/Edge auto-connect after a one-time permission grant, while other browsers
need you to nudge a control first to expose the device. Still, the desktop app is the real target.

> **This app is not required to fly.** Each panel identifies itself as a standard USB game
> controller, so once you've bound its buttons in MSFS's own controls setup, the sim reads it
> directly, with or without this app running. This app is purely a **companion for checking and
> configuring** your panel: watching its live state to verify wiring and button mapping, and (for
> the Autopilot) tuning per-encoder acceleration. Close it whenever you like before you fly;
> nothing about the panel itself depends on it.

## Download (Windows)

Grab the latest desktop build from the **[Releases page](../../releases/latest)**. Under the
release's **Assets**, you'll see two installers; either one works, they install the exact same app:

| File | What it is | Pick this if… |
|---|---|---|
| `nobsapp_v<version>_setup.exe` | A normal setup wizard | **Most people want this.** It's smaller and walks you through a quick install. |
| `nobsapp_v<version>.msi` | The "MSI" installer format | You specifically prefer MSI (e.g. for managed/work machines). |

Both create Start-menu and desktop shortcuts. Heads up: the installers aren't code-signed (that
costs money), so the first time you run one Windows may pop up a blue "Windows protected your PC"
box. That's expected: click **More info → Run anyway**. The app's renderer (WebView2) already
ships with Windows 11; on older Windows the installer grabs it for you.

## What it shows

- **Home** (`/`): a live picture of your panel: knobs that turn, switches that flip, plus a press
  count for each control and whether the panel is connected.
- **Events** (`/events`): a running log of everything the panels and Windy send, newest at the top.
- **Tools** (`/tools`): four navigation dials (HSIs), one per knob, that you steer by turning the
  knobs.
- **Devices** (`/devices`): which modules are plugged in right now, and where you connect (or
  release) Nobs Windy's serial port.
- **Settings** (`/settings`): light / dark / match-my-system theme.

<img src="docs/screenshot-home.png" alt="Home page showing the live panel mimic" width="49%"> <img src="docs/screenshot-autopilot-settings.png" alt="Autopilot settings page with per-encoder acceleration sliders" width="49%">

## The hardware

Three panels, each its own board wired up to look like a USB game controller, plus **Nobs Windy** —
a wind-effects box that works quite differently (see below). Every
board shares the same vendor ID, `0x303a` (Espressif), and is told apart by product ID: each panel
reserves a block of four PIDs (one per physical unit, so you can run more than one of the same
panel), starting at `0x80F0` for Nobs Panel, `0x80F4` for Nobs Autopilot, `0x80F8` for Nobs
Approach. A board is assigned a specific slot in its block with the firmware's `SET_ID` command, so
multiple units of the same panel stay distinguishable.

| Panel | Controls | HID buttons |
|---|---|---|
| **Nobs Autopilot** | 4 rotary encoders (detented, each also pushes in like a button), 8 ON-ON momentary toggle switches | 20 |
| **Nobs Approach** | Flaps lever (momentary up/down, 5 detents), Gear lever (2-position, maintained), push-pull parking brake knob (maintained) | 6 |
| **Nobs Panel** | 8 bat toggle switches (SW1–SW6 are 2-position ON-ON, SW7–SW8 are 3-position ON-OFF-ON) | 16 |

### Nobs Windy — the odd one out

**Nobs Windy** is a wind-effects generator: an Arduino Uno Rev3 with a Motor Shield driving two
fans, plus three push buttons (fan on/off, speed up, speed down) and five speed levels. It is not a
game controller and has **no HID interface at all** — everything travels over a two-way USB serial
link, which makes it the one module this app can *drive* as well as read. Press a button on the box
and it pushes its new state to the app unprompted; change the speed in the app and the fans follow.

It is also the one module the app cannot identify by USB ID. Every Windy looks like a plain Arduino
Uno (`0x2341:0x0043`) because the Uno's USB identity lives in a separate chip its firmware can't
rewrite, so the per-unit ID (`0x80FC`+) is a logical one kept in EEPROM and only readable over the
open link. You therefore pick Windy's COM port yourself on the Devices page, and the app confirms
what it is by talking to it.

Windy runs perfectly well on its own — the buttons drive it directly, and it remembers its setting
across a power cycle. The app is only a companion, exactly like it is for the panels.

Building your own? The Autopilot's full wiring and button numbering live in
[`docs/mapping.md`](docs/mapping.md), in tables you can follow along with. The firmware and wiring
for every module lives in its own companion hardware repo — Windy's serial command set is in
`nobs-fs-windy/docs/serial-protocol.md`.

### How the buttons are numbered

A game controller only speaks in numbered buttons, so each panel's firmware assigns its own knobs
and switches a number, in the order below. For the flagship **Nobs Autopilot**, each knob takes
three buttons in a row (turn one way, turn the other, push), then the toggle switches follow:

| Button number | What it is |
|---|---|
| `enc*3 + 0` | knob *enc* turned clockwise |
| `enc*3 + 1` | knob *enc* turned counter-clockwise |
| `enc*3 + 2` | knob *enc* pushed in |
| `12 + sw`   | flick switch *sw* |

So buttons `0–11` are the four knobs and `12–19` are switches SW1–SW8. Nobs Approach and Nobs
Panel follow their own, simpler numbering — every panel's button count, numbering, and layout is
defined in one place, [`src/panel/panel.ts`](src/panel/panel.ts), the single source of truth the
app reads from.

> Why the knobs feel "paced": the sim only checks the controller about once per video frame, so the
> firmware holds each knob click long enough to be noticed. In practice that caps a fast spin at
> roughly 33 steps a second, plenty for real flying.

## Working on the app itself

Just want to fly? Grab the installer above; you don't need any of this. This part is for poking at
the code. You'll need [pnpm](https://pnpm.io) installed.

```sh
pnpm install
pnpm dev        # run it in your browser (with live reload)
pnpm tauri dev  # run the desktop app (with live reload)
pnpm lint       # check the code style
pnpm format     # auto-fix the code style
pnpm build      # produce the production web build
pnpm screenshots # regenerate the README screenshots (Playwright)
```

### How the app finds your panel

The same build runs everywhere, so it picks the right way to talk to your panel depending on where
it's running:

| Where it's running | How it connects |
|---|---|
| Desktop app | Finds the panel by itself, nothing to click |
| Chrome / Edge | Auto-connects after you click "allow" once |
| Other browsers | You flip a switch or turn a knob once, then it appears |

All three feed the same UI, so the app behaves identically no matter how you launched it.

### Where things live in the code

```
src/
  io/         talking to the panel (decoding the USB data, one path per environment)
  panel/      the hardware definition: which panels exist, button numbering, layout
  hooks/      shared device state the screens read from
  pages/      the screens (Home, Events, Tools, Devices, Settings, …)
  components/ the reusable UI pieces
  theme/      colors
src-tauri/    the desktop-app shell (Rust)
```

[`CLAUDE.md`](CLAUDE.md) spells out the conventions this repo follows if you want to contribute.

## Building & releasing the desktop app

How to build the Windows installers yourself, the automated release setup, and how the app icon is
made are all in **[docs/desktop-build.md](docs/desktop-build.md)**.

## License

Copyright (C) 2026 Vegar Eeg.

This project is licensed under the **GNU Affero General Public License v3.0** (AGPL-3.0-only). In
plain terms: use it, change it, share it, even sell it, but if you hand it out or run a changed
version as an online service, you have to share your source under this same license too. The full
legal text is in [LICENSE](LICENSE).
