# nobs-fs-app

A React + Vite + TypeScript app that monitors a custom MSFS 2024 autopilot hardware
panel over USB. It reads a 4-encoder / 8-switch Arduino Micro panel (USB HID gamepad)
and visualizes its inputs, with a Tauri build for a native desktop window.

## Hardware

- Arduino Micro as a USB HID gamepad (VID `0x2341`, PID `0x0657`)
- 4 Bourns PEC11 rotary encoders (each with a push button)
- 8 ON-ON momentary switches
- Button mapping: `buttons[0–7]` = switches SW1–SW8, `buttons[8–15]` = encoders (CW/CCW pairs)

## Development

```sh
pnpm install
pnpm dev        # Vite dev server (web)
pnpm tauri dev  # native desktop window
pnpm lint       # Biome check
pnpm format     # Biome auto-fix
pnpm build      # type-check + production build
```

## License

Copyright (C) 2026 Vegar Eeg.

This project is licensed under the **GNU Affero General Public License v3.0**
(AGPL-3.0-only). You are free to use, modify, and distribute it — including
commercially — but if you distribute it or run a modified version as a network
service, you must release your full source under the same license. See
[LICENSE](LICENSE) for the full text.
