# nobs-fs-app

React + Vite + TypeScript app that monitors a family of custom MSFS 2024 hardware panels (Autopilot,
Approach, Panel) over USB HID. Each panel is a standard USB game controller MSFS binds directly, so
this app is not required to fly — it's a companion for checking panel state and configuring it.

## Workflow

**Update `CHANGELOG.md` with every change.** After making any code change, add an entry under the
`[Unreleased]` section ([Keep a Changelog](https://keepachangelog.com) format: Added / Changed /
Removed / Fixed). When cutting a release, rename `[Unreleased]` to the version + date and start a
fresh `[Unreleased]` above it.

## Hardware

Three panels, each its own USB HID gamepad board sharing Espressif's vendor ID `0x303A`; product ID
picks out which panel and which physical unit (a 4-PID block per product: Panel `0x80F0`+,
Autopilot `0x80F4`+, Approach `0x80F8`+). Full registry: `src/panel/panel.ts`.

- **Nobs Autopilot**: 4 Bourns PEC11 rotary encoders (with push button) + 8 ON-ON momentary
  switches. Button mapping: `buttons[0–11]` = encoders (CW/CCW/push triplets), `buttons[12–19]` =
  switches SW1–SW8.
- **Nobs Approach**: flaps lever, gear lever, push-pull parking brake — 6 buttons.
- **Nobs Panel**: 8 bat toggle switches, each wired through both terminals — 16 buttons.

## Stack

- React 19, Vite 8, TypeScript 6, pnpm
- CSS Modules for all component styles
- No UI library
- Biome for lint + format (`pnpm lint` to check, `pnpm format` to auto-fix). Style: single
  quotes, no semicolons, 2-space indent, 100 col, enforced by `biome.json`.

## Conventions

### Path alias
`~` maps to `src/`. Always use `~/` imports; never relative paths when the alias applies.
```ts
import { useDevice } from '~/hooks'       // correct
import { useDevice } from './hooks/useDevice' // wrong
```

### Barrel exports
Every folder under `src/` must have an `index.ts` that re-exports its public API.

### Folder naming
Folder name must match the primary exported component.
```
Encoder/Encoder.tsx   ✓
EncoderGrid/EncoderCard.tsx  ✗
```

### CSS Modules
One `ComponentName.module.css` per component. No global styles for component-specific rules.

### Component composition pattern
- **Shell component** (`PanelCard`) owns: `background: var(--bg-card)`, padding, flex layout, active state.
- **Content components** (`Encoder`, `SwitchBtn`) return a bare `<>fragment</>`: no card wrapper, no layout knowledge.
- **Orchestrator** (`PanelGrid`) wraps each cell in `<PanelCard>` and decides the `active` value.

```tsx
// PanelGrid — correct
<PanelCard active={pressed}>
  <SwitchBtn ... />
</PanelCard>

// SwitchBtn — correct
export function SwitchBtn(...) {
  return <>{/* content only */}</>
}
```

## Theme

Colors live in `src/theme/palette.ts`. `injectThemeCssVars()` (called in `main.tsx`) writes them to CSS custom properties on `<html>`. All component CSS uses `var(--token)`, never hardcoded hex values.

Key tokens: `--bg`, `--bg-panel`, `--bg-card`, `--bg-card-hi`, `--accent`, `--accent-light`, `--danger`, `--green`, `--text`, `--text-bright`, `--text-mid`, `--text-dim`, `--border`, `--border-mid`.

## Project structure

```
src/
  main.tsx               entry; calls injectThemeCssVars()
  App.tsx                root layout (state + hook wiring)
  App.module.css
  io/                    input drivers (raw device bits, env-specific)
    types.ts             DeviceDriver interface + DeviceSnapshot
    decodeReport.ts      Arduino Joystick HID report → pressed[] (shared)
    gamepadDriver.ts     Gamepad API polling (web/dev fallback; needs actuation)
    webhidDriver.ts      WebHID auto-detect (Chromium; one-time permission grant)
    nativeDriver.ts      Tauri HID bridge (native; scaffold, Rust side pending)
    selectDriver.ts      runtime env detection → active driver
    webhid.d.ts          minimal WebHID typings (not in lib.dom)
    index.ts
  hooks/
    useDevice.ts         backend-agnostic: press detection, counts, events
    useEventLog.ts       autopilot event log (wraps useDevice)
    index.ts
  components/
    index.ts             public barrel
    Header/              connection badge + title
    Section/             reusable labeled panel wrapper
    PanelCard/           card shell (bg, padding, active state)
    PanelGrid/           6×2 physical panel layout + ENCODER_LABELS
    Encoder/             encoder content (arrows, counts, net)
    SwitchBtn/           switch content (indicator, state)
    EventLog/            scrollable event log + LogEntry type
  theme/
    palette.ts           color tokens (single source of truth)
    cssVars.ts           maps palette → CSS custom properties
    index.ts
```
