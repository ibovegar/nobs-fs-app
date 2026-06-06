# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `firmware/nobs-autopilot/nobs-autopilot.ino` — full Arduino Micro firmware for all 4 encoders
  and 8 switches. Reports 20 HID buttons in the app's expected order (encoders first as
  CW/CCW/push, then SW1–SW8). Encoder CW/CCW pulses are non-blocking (40 ms hold via `millis()`)
  so all encoders and switches stay responsive.
- `docs/mapping.md`: physical pin-assignment tables (Arduino Micro labels + AVR ports) for every
  encoder and switch, linked to the firmware sketch; replaced the stale "1 encoder test setup"
  section. Added a "Signal decoding (firmware behavior)" section (quadrature decode, pulse vs.
  level, one report per loop) and a wiring convention note (internal pull-ups, encoder/switch
  GND connections).
- `docs/desktop-build.md` — documents the Tauri desktop build: prerequisites, `pnpm tauri dev/build`
  and their outputs, a step-by-step "cutting a new build" procedure (version bump → lint/build →
  `pnpm tauri build` → collect artifacts → smoke-test), the app-icon generation procedure
  (`pnpm tauri icon` from `app-icon.png`, and rasterizing the source from `favicon.svg`), key
  `tauri.conf.json` settings, and troubleshooting.
- Favicon: `index.html` now links `public/favicon.svg` as the browser tab icon.

### Changed
- Tools page now shows four HSIs — one per encoder (ENC1–ENC4) — in a 2×2 grid, each with its own
  field selector and state. Extracted the per-encoder logic into a new `HsiTool` component; the
  page no longer hardcodes a single ENC1-driven instrument.
- Firmware: rewrote encoder rotation as a full quadrature decoder. Reads both A and B each loop and
  accumulates only valid Gray-code transitions, emitting one CW/CCW step per detent (±4 counts).
  Replaces single-A-edge detection, which sampled B at the wrong instant on CCW and produced false
  CW steps plus dropped counts. Bounce nets to zero, so both directions are stable; rest-position
  independent. CW/CCW orientation unchanged.
- Firmware: disabled the Joystick library's auto-send (`begin(false)`) and now call `sendState()`
  once per loop. Previously every `setButton()` sent its own USB report (~12 per loop), slowing the
  loop enough that the quadrature decoder missed transitions and felt unresponsive.

### Fixed
- Firmware: rapid encoder rotation no longer drops counts. CW/CCW steps are now queued
  (`pending[]`) and paced out as short press + low-gap pulses (`PULSE_ON_MS` / `PULSE_GAP_MS`)
  instead of holding and re-arming one button, which merged fast steps into a single long press.
- Firmware: ENC4 push moved off `PB0` (D17 = RX LED, held low → always-pressed) onto `PB2`
  (D16 / MOSI). Requires moving ENC4's `S` wire to pin 16.
- `PANEL_LAYOUT`: switch grid positions updated to match the physical hardware. SW4 now sits in
  row 2 (the middle slot between the encoders); row 1 reads SW1 · SW2 · SW3 · SW5 · SW6 · SW7. Each
  switch keeps its label and HID button index — only its on-screen position changes.
- Header now displays the `logo_2.svg` brand logo (24px tall) in place of the text "Nobs FS"
  title (40px tall); removed the `.title`/`.titleMain`/`.titleSub` styles.

### Removed
- Press counters inside the panel grid items: the encoder CW/CCW counts and net display, and the
  switch `count×` tally. Grid cells now show only live state (arrows, push/indicator dots, ON/OFF).
  Removed the now-unused `count` prop from `SwitchBtn` and the associated CSS.

### Added
- Tauri v2 desktop shell (`src-tauri/`) — the app now builds to a native Windows executable and
  installers (`.msi` + NSIS `-setup.exe`) via `pnpm tauri build`. `pnpm tauri dev` runs the desktop
  app against the Vite dev server. Bundle identifier `com.nobs.fs`; standalone binary named
  `Nobs FS.exe` (via `mainBinaryName`).
- App icon — generated all `src-tauri/icons/` assets (Windows `.ico`, macOS `.icns`, PNGs, Store
  logos) from the favicon emblem via `pnpm tauri icon`. The 1024×1024 source is kept at
  `app-icon.png` (the default path `pnpm tauri icon` reads, so re-generating is a no-arg command).
  The icon is baked into the exe, taskbar, and the installer's Start-menu/desktop shortcuts.
- Native HID backend (`src-tauri/src/hid.rs`) — implements the Rust side the `nativeDriver` expected.
  `hid_open`/`hid_close` Tauri commands spawn a per-device worker that reads the panel via the
  `hidapi` crate and emits `hid://report` (report-ID byte stripped to match WebHID) and
  `hid://connection` events, reconnecting automatically on replug. No knob-turn or permission grant
  needed in the native build.
- Header close button — an `×` icon on the right of the header closes the native window (and, as the
  only window, the app). Rendered only in the desktop build, gated by the new `isNative()` helper
  (`~/io`); hidden in the web app. Uses a dynamic `import('@tauri-apps/api/window')` so the Tauri
  window API is code-split out of the web bundle. Window-close permission added in
  `src-tauri/capabilities/default.json`.
- `isNative()` (`src/io/env.ts`) — single source of truth for "running inside Tauri", reused by
  `selectDriver` (replacing its private `isTauri`) and the header close button.

### Fixed
- White flash on native launch — the window is now created hidden (`visible: false`) and revealed
  from `main.tsx` after the first paint (`core:window:allow-show`), and `index.html` paints the dark
  `--bg` color inline before any JS loads, so WebView2's white initialization surface is never shown.

### Changed
- Native desktop window is now frameless (`decorations: false`) — the OS title bar/toolbar is gone.
  The header is marked `data-tauri-drag-region` so the window can still be moved by dragging it
  (`core:window:allow-start-dragging`).
- Default desktop window size is now 1500×900 (was 800×600).
- Home device cards and product images now resize with the viewport on both axes. The three Home
  sections share the available height (`flex: 1 1 0`, bounded by `min/max-height`) and each
  `ProductCard` fills its section (`flex: 1`) instead of using a fixed height, so the cards grow and
  shrink with window height and the body scrolls only when the viewport is too short. The product
  image column uses a `clamp()`-based flex basis (`300px`–`34vw`–`480px`) and the image fills its cell
  with `object-fit: contain`, so it follows the card on both axes. Removed the `margin-bottom: -30px`
  crop hack (which painted the image over the nav) and clipped the image area with `overflow: hidden`,
  fixing the Tools/Settings buttons being hidden when the window was short.
- `nativeDriver` now uses the typed `@tauri-apps/api` (`invoke`/`listen`) instead of the
  `window.__TAURI__` global, and is no longer a scaffold — it is backed by the Rust HID bridge above.
- Product image (`ProductImage`) now has a subtle CSS `filter` that nudges it toward the sapphire
  theme accent so it blends with the dark blue-grey UI instead of clashing with its original colors.

### Added
- WebHID driver (`webhidDriver`) — automatic device detection in Chromium without the Gamepad
  API's "actuate to appear" requirement. Uses `navigator.hid`: opens already-granted devices on
  load and reacts to `connect`/`disconnect`, so the panel is detected as soon as it's plugged in.
  Requires a one-time permission grant via the new **Connect device** button on the Devices page
  (`requestHidDevices`, a user gesture); the grant persists per-origin. `selectDriver` now prefers
  it on the web (Chromium), falling back to the Gamepad API elsewhere.
- `decodeJoystickReport` — decodes the Arduino Joystick library's HID input report (buttons packed
  LSB-first, report-ID stripped) into `pressed[]`. Shared by the WebHID and native drivers.
- Devices page (`/devices`) now lists every registered device (Autopilot, Approach, Panel) with
  its VID:PID, a live connection indicator, and a per-device **Connect** button (replacing the
  placeholder). Approach/Panel are listed even though they're still imaginary placeholders.
- `src/io` input-driver layer that decouples *where raw button bits come from* from the press
  detection/counting logic. `DeviceDriver` interface emits `DeviceSnapshot`s; `gamepadDriver`
  (web/dev, Gamepad API) and `nativeDriver` (Tauri HID bridge — scaffold) implement it, and
  `selectDriver` picks one at runtime (`__TAURI_INTERNALS__` → native, else gamepad). This lets the
  app auto-detect the device in the native build without the Gamepad API's "actuate to appear"
  requirement, while the web build keeps working unchanged.
- `Hsi` component — a typed React wrapper around the `@fboes/horizontal-situation-indicator`
  vanilla-JS web component, themed via CSS variables (transparent face, cyan heading-select,
  magenta NAV1). Displayed on the Tools page.
- Tools page field selector — four buttons to the right of the HSI (Heading, Heading bug, NAV1
  course, NAV1 bearing) pick which field the autopilot's ENC1 encoder adjusts (5° per detent).
  Each button shows the field's current value; pressing the encoder resets all four to 0°.
- `ProductImage` now renders a row of navigational links (icon + text) below the product image:
  **Tools** (`/tools`) and **Settings** (`/settings`), as `NavLink`s with hover and active states.
- `~/pages/Tools` — a new self-contained `/tools` route view (borderless back button + "Coming
  soon" section), reached from the Tools link on the product cards.
- Borderless back button (arrow + "Back") at the top of the Tools / Settings views, navigating to
  the previous route via `useNavigate(-1)`.
- Client-side routing via `react-router`. Each sidebar item is now its own route: Home (`/`),
  Devices (`/devices`), Event log (`/events`), Settings (`/settings`). `App` owns the gamepad
  hooks and renders the matched route inside the body; `main.tsx` wraps the app in
  `BrowserRouter`.
- `~/pages` — route view components: `Home` (the three product cards, formerly the whole body),
  `Events` (the event log, moved off Home onto its own route), and `Devices` / `Settings`
  placeholders (sharing a small `Placeholder` view).
- `Sidebar` — a 72px icon rail (Home / Devices / Event log / Settings), each item an icon with a
  label beneath it, using LineIcons. Transparent background, no border. Items are `NavLink`s that
  drive the active route (active state from `NavLink`'s `isActive`). App layout is a column with
  the header on top, and a sidebar + body row beneath it.
- LineIcons icon library via the official React SVG packages (`@lineiconshq/react-lineicons` +
  `@lineiconshq/free-icons`) — tree-shakeable, typed named icon imports. Added a thin `Icon`
  wrapper (`~/components`) over `Lineicons` so call sites import from `~/components` instead of the
  vendor; `color` defaults to `currentColor`, so icons follow the theme color cascade.
- `useEventLog` hook that owns the event-log state and the gamepad-event → `LogEntry` translation
  (including encoder-push count reset), wrapping `useGamepad` internally.
- Device registry (`DEVICES` + `DeviceConfig`) in `~/panel`. Nobs Approach and Nobs Panel are now
  modeled as their own USB HID gamepads (6 switches each) alongside Nobs Autopilot, each with its
  own VID/PID. Approach/Panel use **imaginary** identities (`f110:0a01`, `f110:0a02`) until the
  hardware exists; Autopilot keeps the real `2341:0657`.

### Changed
- Body content is now centred with a max width (1500px); Sidebar vertical padding tightened.
- Renamed `useGamepad` → `useDevice` (and `GamepadState`/`GamepadEvent` → `DeviceState`/
  `DeviceEvent`); it now consumes a `DeviceDriver` from `~/io` rather than polling the Gamepad API
  directly. Web behaviour is identical.
- The event log now fills the full height of the `/events` view instead of a fixed 200px box.
  `EventLog`'s `.log` flexes to fill its container, the `Events` page stretches its `Section` to
  fill the body, and `Section` gained an optional `className` prop so a route can opt into that
  growth.
- The app shell is now bounded to the viewport (`height: 100vh` + `overflow: hidden`) and the body
  scrolls internally (`overflow-y: auto`), so the full-height event log stays within the viewport
  and scrolls in place instead of stretching the page.
- Minor spacing/typography tweaks: `Section` label uses `--sp-4` vertical padding, the `Sidebar`
  label is 11px, and the body drops its left padding.
- `App` no longer contains the `handleEvent`/`addLog` logic; it now consumes `useEventLog` and
  just wires `log`, `isConnected`, and `buttons` into the layout.
- `useGamepad` now takes a `DeviceConfig` (vid/pid/buttonCount) instead of hardcoding the
  Autopilot constants, and `onEvent` is optional. App polls all three devices independently.
- `Approach` and `Panel` now render live button state from their gamepad (via a `buttons` prop)
  instead of static placeholder switches.
- `ProductImage` takes an `isConnected` prop and feeds it to its `ConnectionIndicator`, so each
  product's connection badge reflects its actual device (previously hardcoded to connected).

### Removed
- `DEVICE_VID` / `DEVICE_PID` constants from `~/panel` — superseded by `DEVICES.autopilot`.
- Replaced all hardcoded `gap`/`padding`/`margin` pixel values across component CSS with
  `--sp-*` spacing-scale tokens (`App`, `Header`, `Section`, `PanelCard`, `Encoder`, `EventLog`,
  `ConnectionIndicator`). Off-scale values were snapped to the nearest 4px step (3/5px → 4,
  6px → 8, 10px → 12, 14px → 16). The `1px` grid `gap`s in `PanelGrid`/`Approach`/`Panel` are
  hairline dividers, not spacing, and were left as-is.
- All product control grids (`PanelGrid`, `Approach`, `Panel`) now distribute their cells with
  equal height and width. Grid rows use `1fr` instead of `auto`, and `Approach`/`Panel` gained
  `flex: 1` so they fill the product card like `PanelGrid` — every cell fills an equal share of
  the available space in both the default and `max-width: 720px` layouts.
- Regenerated `palette.grey` as a cool blue-grey ramp hue-aligned with the backgrounds (replaces
  the old neutral/purple-ish greys).
- Renamed `background.paper` → `background.card` (`#222931`); `--bg-panel` / `--bg-card` now map
  to it.
- `--bg-gradient-slate-dusk` is now a 135° two-stop gradient (`#252C33` → `#1D2228`) defined
  directly in `cssVars` instead of via a separate `gradient.slateDusk` palette object, which was
  removed.

### Removed
- Connection status badge from the `Header` — connection state is now shown per product via the
  `ConnectionIndicator` on each `ProductImage`, so `Header` no longer takes an `isConnected` prop.

### Added
- `--bg-darker` background token (`#10161A`, `palette.background.darker`) — a shade darker than
  the page background, used as the `Header` background bar.
- "Slate Dusk" background gradient — subtle diagonal (135°) cool blue-grey fade between
  `background.card` and `background.default`, exposed as the `--bg-gradient-slate-dusk` CSS custom
  property.
- Product view: Nobs Autopilot (existing encoder + switch panel), Nobs Approach, and Nobs
  Panel, each rendered in its own `Section` card with the controls on the left and the product
  image on the right.
- `ProductCard` component (`~/components`) — card shell that lays out a product's image and
  controls side by side.
- `ProductImage` component (`~/components`) — renders a product image with its name overlaid
  at the top-left.
- `Approach` / `Panel` components (`~/components`) — six placeholder switches each for the
  not-yet-wired products.
- `nobs_approach.svg` / `nobs_panel.svg` — dummy placeholder images for the new products.
- `nobs_autopilot.png` panel image, bundled via Vite asset import.
- `~/panel` module — single source of truth for the ESP32 HID button mapping
  (`NUM_SWITCHES`, `NUM_ENCODERS`, `BUTTON_COUNT`, `ENCODER_LABELS`, `cwButton`/`ccwButton`
  index helpers, `decodeButton()`, and the physical `PANEL_LAYOUT`).
- `PanelCard` shell component providing the shared card container (background, padding,
  active state) used across the panel.
- `~/theme` module: `palette.ts` colour tokens with `injectThemeCssVars()` writing them to
  CSS custom properties at startup.
- `docs/connect.md` — how the app talks to the ESP32 over the Web Gamepad API, device
  identification, and two-way communication options.
- `CLAUDE.md` — project conventions and structure for AI-assisted development.
- Biome (`biome.json`) for linting and formatting; `format` script (`biome check --write .`).
- `.gitattributes` enforcing LF line endings repo-wide for consistent Windows/Linux development.
- `spacing.ts` — 4px base spacing scale (`spacing[0..16]`) exposed as `--sp-*` CSS custom
  properties via `injectThemeCssVars()` and exported from `~/theme`.
- `DEVICE_VID` / `DEVICE_PID` constants (`2341` / `0657`) in `~/panel` matching the firmware
  VID/PID; `useGamepad` now filters by these instead of picking the first available gamepad.
- `docs/firmware.md` — step-by-step guide for patching Arduino's `boards.txt` to bake the
  custom USB identity (VID `0x2341`, PID `0x0657`, name "Nobs Autopilot") into the firmware.
- `docs/mapping.md` — full HID button mapping: firmware indices, app constants, decode logic,
  and current test-setup reference table.

### Changed
- Pressing the encoder push button now resets the CW and CCW counters for that encoder.
  `useGamepad` exposes `resetCounts(indices[])` and `App.tsx` calls it via a ref from within
  `handleEvent`. Log entry reads `ENC1 PUSH  (reset)`.
- Button mapping corrected to match firmware: encoders occupy 3 buttons each (CW, CCW, push)
  before standalone switches. Added `BUTTONS_PER_ENCODER`, `pushButton()`, and `switchButton()`
  helpers to `~/panel`; `BUTTON_COUNT` updated to 20.
- `Encoder` gains a `push` prop (`ButtonState`) and shows a small push-button indicator dot
  next to the label, lit when pressed.
- `PanelGrid` uses `switchButton()` and `pushButton()` for correct index lookup.
- Event log now records encoder push events (`ENC1 PUSH` etc.).
- `useGamepad` now returns a single `ButtonState[]` (`{ pressed, lastPress, count }`)
  instead of three parallel arrays; `BUTTON_COUNT` derives from the panel config.
- `Encoder` reduced from 7 scalar props to 3 (`label`, `cw`, `ccw`).
- `PanelGrid` consumes a single `buttons` prop and drives its layout from `PANEL_LAYOUT`.
- Components split into per-folder modules with CSS Modules and barrel exports.
- Theme desaturated toward neutral with increased text contrast; backgrounds preserved.
- Panel layout updated to the physical 6-column × 2-row arrangement (4 encoders, 8 switches).
- Replaced ESLint with Biome for linting and formatting; codebase reformatted to Biome's style.
- `PanelGrid` now keys cells by a stable `${kind}-${index}` instead of the array index.

### Removed
- Vite starter scaffolding: `src/assets/`, `public/icons.svg`, `public/favicon.svg`, and the
  default `App.tsx`/`App.css` boilerplate.
- ESLint and its plugins (`eslint`, `@eslint/js`, `typescript-eslint`,
  `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`) and `eslint.config.js`.
- Stale `BUTTON_COUNT = 20` (left over from the 6-encoder design; now correctly 16).
- Unused `gamepadId` field and the redundant `prevButtons` ref from `useGamepad`.

### Fixed
- Button-index decoding duplicated across `App.tsx` and `PanelGrid` is now defined once in
  `~/panel`, eliminating drift when the hardware layout changes.
- Replaced the non-null assertion on `getElementById('root')` in `main.tsx` with an explicit guard.
