# Building the Desktop App (Tauri)

The app ships as a native Windows desktop application via [Tauri v2](https://tauri.app). The web
build (`pnpm build`) still works everywhere; the desktop build wraps that same frontend in a native
window and swaps the input layer to the native HID driver (`src-tauri/src/hid.rs`), so the panel is
auto-detected with no knob-turn and no browser permission grant.

Everything Tauri-related lives under [`src-tauri/`](../src-tauri).

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

## Building the executable

> **This section is the local build only** — for developing against the desktop shell or producing
> a one-off exe on your own machine. **You do not run any of this to cut a release**; the GitHub
> Actions pipeline builds and publishes the installers for you (see
> [Releasing via GitHub Actions](#releasing-via-github-actions)). Local artifacts are never used by
> that pipeline.

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

## Releasing via GitHub Actions

[`.github/workflows/release.yml`](../.github/workflows/release.yml) builds the Windows installers on a
`windows-latest` runner and uploads them to a GitHub Release, so you don't build or upload by hand.
The runner already has MSVC and WebView2, so there are no extra system deps; it mirrors the local
`pnpm tauri build` flow with a Rust + pnpm cache on top.

The workflow renames the installers before uploading, so the **Release assets** get clean,
download-friendly names (the local build output keeps Tauri's default `Nobs FS_<version>_...` names):

| Local build artifact | Published asset |
|---|---|
| `bundle/nsis/Nobs FS_<version>_x64-setup.exe` | `nobsapp_v<version>_setup.exe` |
| `bundle/msi/Nobs FS_<version>_x64_en-US.msi` | `nobsapp_v<version>.msi` |

`productName` stays `Nobs FS`, so the app, window title, and shortcuts keep the nice display name —
only the downloadable filenames are simplified.

**To cut a release:**

1. Bump `version` in both `package.json` and `src-tauri/tauri.conf.json` to the same value. See
   [Versioning: what actually matters](#versioning-what-actually-matters) below for why the
   `tauri.conf.json` bump is non-optional.
2. Update `CHANGELOG.md`: rename the `## [Unreleased]` heading to the new version and date (e.g.
   `## [0.2.0] - 2026-06-13`), then add a fresh empty `## [Unreleased]` heading above it for future
   changes. The entries you accumulated under `[Unreleased]` *are* this version's changelog — you're
   just retitling the section, not moving text around.
3. Commit and push that.
4. Tag and push:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```
5. The workflow builds and **publishes** the release `Nobs FS v0.2.0` with
   `nobsapp_v0.2.0_setup.exe` and `nobsapp_v0.2.0.msi` attached. It's public as soon as the run
   finishes — no manual publish step.

You can also run it manually from **Actions → Release → Run workflow** and type the tag in the input
box (it's created if it doesn't exist yet).

**You do not build locally for a release.** The `windows-latest` runner runs the same
`pnpm tauri build` flow, compiles the installers, and uploads them itself — its artifacts are the
ones published, and any local `target/release/` output is never used by the pipeline. A local
`pnpm tauri build` is only for smoke-testing the exe on your own machine before tagging. What *is*
worth running locally first (it's faster than waiting on CI to fail): `pnpm lint` and `pnpm build`,
to catch frontend errors before the runner spends minutes compiling the Rust crates.

**App icons need nothing at release time.** The files in [`src-tauri/icons/`](../src-tauri/icons)
are committed, and the runner's `pnpm tauri build` bakes whatever's committed into the exe and
installers. You only touch icons when you change the artwork — and that's the separate, earlier
[Creating the app icon](#creating-the-app-icon) step: regenerate, then **commit
`src-tauri/icons/`** so the runner builds with the new set. If you didn't change the icon since the
last commit (the normal case), skip it entirely.

### Versioning: what actually matters

The build version and the git tag are **decoupled** — bumping the tag alone is not enough:

- **`src-tauri/tauri.conf.json` `version` is the one baked into the build.** `tauri-action` runs a
  plain `tauri build`, and Tauri stamps *this* value into the exe's file-version metadata, the MSI
  `ProductVersion` (what shows in *Add/Remove Programs*), and the default bundle filenames. **This
  bump is non-optional.**
- **The git tag only names things.** It feeds the release title (`Nobs FS v0.2.0`) and the renamed
  asset filenames (`nobsapp_v0.2.0.*`) — see the *Rename installers* / *Create release* steps
  in [`release.yml`](../.github/workflows/release.yml). It is never read back into the build.

  So if you tag `v0.2.0` but forget to bump `tauri.conf.json`, you ship a release *named* "Nobs FS
  v0.2.0" with assets *named* `nobsapp_v0.2.0.*` that actually install version **0.1.0** internally.
  That silent mismatch is exactly what this bump prevents.
- **`package.json` `version` does not affect the installer** as long as `tauri.conf.json` sets an
  explicit `version` (Tauri only falls back to `package.json` when the config omits it). Bump it
  anyway to keep the two in sync and to anchor the `CHANGELOG.md` update.

Notes:
- Uses the built-in `GITHUB_TOKEN` — no secrets to configure.
- Releases are **published automatically** on tag push (`draft: false` on the `Create release`
  step), so they're immediately visible to everyone. Draft releases, by contrast, are only visible
  to users with push access — if you'd rather review before going public, set `draft: true` and hit
  **Publish** on the Releases page after each run.
- **Hidden-draft gotcha (pre-`v0.2.1` releases).** Until `v0.2.1`, the workflow used `draft: true`,
  so those releases were built but left as drafts — invisible to anyone without push access, which
  looks like "the release didn't publish." Flipping to `draft: false` only affects *new* tags; it
  does **not** un-draft existing ones. Any old draft (e.g. `v0.2.0`) must be **published or deleted
  by hand** on the GitHub Releases page.
- **Release source branch.** Tags can be cut from any branch, and the build runs against whatever
  tree the tag points at. Early releases (`v0.2.0`, `v0.2.1`) were tagged from `docs/app-screenshots`.
  If you standardize on `main` as the release source, merge release-affecting changes (like the
  `draft: false` fix) into `main` before tagging there.
- The installers are **unsigned**, so Windows SmartScreen may warn on first run ("More info → Run
  anyway"). Removing that warning needs a code-signing certificate — out of scope here.

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
