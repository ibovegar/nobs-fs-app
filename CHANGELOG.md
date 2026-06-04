# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `useEventLog` hook that owns the event-log state and the gamepad-event → `LogEntry` translation
  (including encoder-push count reset), wrapping `useGamepad` internally.
- Device registry (`DEVICES` + `DeviceConfig`) in `~/panel`. Nobs Approach and Nobs Panel are now
  modeled as their own USB HID gamepads (6 switches each) alongside Nobs Autopilot, each with its
  own VID/PID. Approach/Panel use **imaginary** identities (`f110:0a01`, `f110:0a02`) until the
  hardware exists; Autopilot keeps the real `2341:0657`.

### Changed
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
