# nobs-fs-app

**Nobs FS** is a set of DIY flight-sim panels you build yourself on an Arduino — real knobs,
switches and push buttons for flying in Microsoft Flight Simulator. This app is the companion that
shows you what your panel is doing in real time: turn a knob or flip a switch and watch it light up
on screen.

Each panel plugs in over USB and pretends to be an ordinary game controller, so there's nothing
extra to install on the sim side — no plugins, no fiddly config. The app reads the raw button
presses and turns them back into the things you actually did: knob turns, button pushes, switch
flips.

The **native desktop app** (Windows) is the main event: install it, open it, and it finds your
panel on its own — no setup, nothing to click. That's the one to use for actually flying.

The same code also runs in the browser via `pnpm dev`, but that's really just for development. It
works as a fallback — Chrome/Edge auto-connect after a one-time permission grant, other browsers
need you to nudge a control first to expose the device — but the desktop app is the real target.

## Download (Windows)

Grab the latest desktop build from the **[Releases page](../../releases/latest)**. Under the
release's **Assets**, you'll see two installers — either one works, they install the exact same app:

| File | What it is | Pick this if… |
|---|---|---|
| `nobsapp_v<version>_setup.exe` | A normal setup wizard | **Most people want this.** It's smaller and walks you through a quick install. |
| `nobsapp_v<version>.msi` | The "MSI" installer format | You specifically prefer MSI (e.g. for managed/work machines). |

Both create Start-menu and desktop shortcuts. Heads up: the installers aren't code-signed (that
costs money), so the first time you run one Windows may pop up a blue "Windows protected your PC"
box. That's expected — click **More info → Run anyway**. The app's renderer (WebView2) already
ships with Windows 11; on older Windows the installer grabs it for you.

## What it shows

- **Home** (`/`) — a live picture of your panel: knobs that turn, switches that flip, plus a press
  count for each control and whether the panel is connected.
- **Events** (`/events`) — a running log of everything the autopilot panel sends, newest at the top.
- **Tools** (`/tools`) — four navigation dials (HSIs), one per knob, that you steer by turning the
  knobs.
- **Devices** (`/devices`) — which panels are plugged in right now.
- **Settings** (`/settings`) — light / dark / match-my-system theme.

<img src="docs/screenshot-home.png" alt="Home page showing the live panel mimic" width="49%"> <img src="docs/screenshot-autopilot-settings.png" alt="Autopilot settings page with per-encoder acceleration sliders" width="49%">

## The hardware

The main panel, **Nobs Autopilot**, is an Arduino board wired up to look like a USB game controller:

- 4 rotary encoders — the detented knobs; each one also pushes in like a button
- 8 ON-ON momentary toggle switches
- It identifies itself with VID `0x2341`, PID `0x0657` (think of those as the panel's "name tag"
  so the app can pick it out from any other controllers you have plugged in)

Building your own? The full wiring and the firmware live in [`docs/mapping.md`](docs/mapping.md) —
every pin, every button number, in tables you can follow along with.

### How the buttons are numbered

A game controller only speaks in numbered buttons, so the firmware assigns each knob and switch a
number. Each knob takes three buttons in a row (turn one way, turn the other, push), then the flick
switches follow:

| Button number | What it is |
|---|---|
| `enc*3 + 0` | knob *enc* turned clockwise |
| `enc*3 + 1` | knob *enc* turned counter-clockwise |
| `enc*3 + 2` | knob *enc* pushed in |
| `12 + sw`   | flick switch *sw* |

So buttons `0–11` are the four knobs and `12–19` are switches SW1–SW8. If you ever need to change
this, it all lives in one place: [`src/panel/panel.ts`](src/panel/panel.ts). (Two more panels,
**Nobs Approach** and **Nobs Panel**, are sketched in there too — placeholders for hardware that
doesn't exist yet.)

> Why the knobs feel "paced": the sim only checks the controller about once per video frame, so the
> firmware holds each knob click long enough to be noticed. In practice that caps a fast spin at
> roughly 33 steps a second — plenty for real flying.

## Working on the app itself

Just want to fly? Grab the installer above — you don't need any of this. This part is for poking at
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
| Desktop app | Finds the panel by itself — nothing to click |
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
plain terms: use it, change it, share it, even sell it — but if you hand it out or run a changed
version as an online service, you have to share your source under this same license too. The full
legal text is in [LICENSE](LICENSE).
