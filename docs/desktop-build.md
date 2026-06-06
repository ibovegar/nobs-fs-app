# Building the Desktop App (Tauri)

The app ships as a native Windows desktop application via [Tauri v2](https://tauri.app). The web
build (`pnpm build`) still works everywhere; the desktop build wraps that same frontend in a native
window and swaps the input layer to the native HID driver (`src-tauri/src/hid.rs`), so the panel is
auto-detected with no knob-turn and no browser permission grant.

Everything Tauri-related lives under [`src-tauri/`](../src-tauri).

---

## Prerequisites (one-time)

| Tool | Why | Install |
|---|---|---|
| **Rust** (stable, MSVC) | Compiles the native backend | `winget install Rustlang.Rustup` — or download `rustup-init.exe` and run `rustup-init.exe -y --default-toolchain stable-x86_64-pc-windows-msvc` |
| **MSVC C++ build tools** | Linker (`link.exe`) for the Rust MSVC toolchain | Visual Studio / Build Tools with the "Desktop development with C++" workload |
| **WebView2 runtime** | Renders the UI in the native window | Pre-installed on Windows 11; otherwise ships via Microsoft's Evergreen installer |

> **PATH note:** rustup installs `cargo`/`rustc` to `%USERPROFILE%\.cargo\bin`. If a fresh shell
> can't find `cargo`, that directory isn't on `PATH` yet — open a new terminal, or prepend it for
> the session: `$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"`.

The JS side is already wired up: `@tauri-apps/cli` (dev dep), `@tauri-apps/api` (dep), and the
`tauri` script in `package.json`.

---

## Building the executable

```powershell
pnpm tauri dev      # run the desktop app against the Vite dev server (hot reload)
pnpm tauri build    # produce the release exe + installers
```

`pnpm tauri build` runs `pnpm build` first (the `beforeBuildCommand` in `tauri.conf.json`), compiles
the Rust backend, then bundles. Outputs land in `src-tauri/target/release/`:

| Artifact | Path | Use |
|---|---|---|
| Standalone exe | `Nobs FS.exe` | Run directly — no install, but creates no shortcut |
| MSI installer | `bundle/msi/Nobs FS_<version>_x64_en-US.msi` | Windows Installer; creates Start-menu/desktop shortcuts |
| NSIS installer | `bundle/nsis/Nobs FS_<version>_x64-setup.exe` | Setup wizard; creates Start-menu/desktop shortcuts |

> The first release build can take a few minutes (it compiles ~470 crates). Subsequent builds reuse
> the cache and finish in well under a minute.

### Cutting a new build — step by step

1. **Bump the version** (skip for a throwaway/test build). Keep the two in sync:
   - `version` in [`src-tauri/tauri.conf.json`](../src-tauri/tauri.conf.json) — this is the version
     stamped into the exe and the installer filenames (`Nobs FS_<version>_x64-setup.exe`).
   - `version` in [`package.json`](../package.json), and move the `CHANGELOG.md` `[Unreleased]`
     entries under the new version heading.
2. **Make sure the frontend is clean:** `pnpm lint` and `pnpm build` should both pass (the build also
   runs as part of `tauri build`, but catching errors here is faster).
3. **Build:** `pnpm tauri build`. (Ensure `cargo` is on `PATH` — see the note above.)
4. **Collect the artifacts** from `src-tauri/target/release/`:
   - `Nobs FS.exe` — the standalone executable
   - `bundle/msi/Nobs FS_<version>_x64_en-US.msi`
   - `bundle/nsis/Nobs FS_<version>_x64-setup.exe`
5. **Smoke-test** the exe (launch it, confirm the window/icon) before distributing.

> Re-running `pnpm tauri build` overwrites the previous artifacts in place. If you bumped the version,
> the installer filenames change (they include the version), so the old installers are left behind —
> delete them if you don't want stale copies lying around.

---

## Creating the app icon

Tauri generates **every** icon size and format from a single square source image — you never
hand-author the individual files.

```powershell
pnpm tauri icon app-icon.png    # regenerate all of src-tauri/icons/
pnpm tauri build                # bake the new icon into the exe + installers
```

- The source is [`app-icon.png`](../app-icon.png) at the repo root — a **1024×1024 PNG with
  transparency**. That filename is the default `pnpm tauri icon` reads, so regenerating is a no-arg
  command once the file exists.
- The generator writes the Windows `.ico` (used by the exe, taskbar, and installer shortcuts), the
  macOS `.icns`, the raster PNGs, and the Microsoft Store logos into
  [`src-tauri/icons/`](../src-tauri/icons). (It also emits unused iOS/Android assets — harmless.)
- The icon only appears in the running app/taskbar and in installs. Running `Nobs FS.exe` straight
  from `target/release` shows the embedded exe icon but creates no shortcut — shortcuts come from the
  `.msi`/`-setup.exe`.

### Regenerating the source from the SVG favicon

`app-icon.png` was rasterized from [`public/favicon.svg`](../public/favicon.svg) (the square
sapphire→purple emblem). The SVG is only 26×26, so it must be rendered at high density to get a crisp
1024px raster. There's no SVG rasterizer checked in; run one ephemerally so nothing is added to
`package.json`:

```powershell
pnpm dlx sharp-cli --input public/favicon.svg --output app-icon.png --density 2900 resize 1024 1024
```

To use a different brand asset instead, just drop a square PNG (≥512px, ideally 1024×1024) at
`app-icon.png` and run the two `pnpm tauri ...` commands above.

---

## Key configuration

All of the following live in [`src-tauri/tauri.conf.json`](../src-tauri/tauri.conf.json):

| Field | Value | Notes |
|---|---|---|
| `productName` | `Nobs FS` | Display name; used for installers and shortcuts |
| `mainBinaryName` | `Nobs FS` | Renames the standalone exe to `Nobs FS.exe`. A Cargo `[[bin]]` name **can't** contain a space, so this is the right lever — don't rename the Cargo target |
| `identifier` | `com.nobs.fs` | Reverse-DNS bundle id; must be unique per app |
| `app.windows[0].width` / `height` | `1500` / `900` | Default window size on launch |

The Rust dependencies (`tauri`, `hidapi`, `serde`, …) are in
[`src-tauri/Cargo.toml`](../src-tauri/Cargo.toml); the native HID bridge is
[`src-tauri/src/hid.rs`](../src-tauri/src/hid.rs).

---

## Troubleshooting

- **`rustc` crashes with `STATUS_HEAP_CORRUPTION` (exit `0xc0000374`) compiling `tao`.** A
  non-deterministic compiler crash, not an error in our code. Just re-run `pnpm tauri build` — Cargo
  resumes from the cached crates and it almost always succeeds on the next pass.
- **`cargo: command not found`.** The `.cargo\bin` directory isn't on `PATH` in this shell — see the
  PATH note under Prerequisites.
- **Linker error / `link.exe` not found.** The MSVC C++ build tools aren't installed or the
  "Desktop development with C++" workload is missing.
