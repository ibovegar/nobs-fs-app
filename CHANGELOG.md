# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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

### Changed
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
