import { defineConfig, devices } from '@playwright/test'

// Playwright is used here only to capture the README screenshots in `tests/screenshots.spec.ts`.
// It boots the Vite dev server, drives the app in a headless Chromium, and writes PNGs to `docs/`.
const PORT = 5173

export default defineConfig({
  testDir: 'tests',
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Desktop Chrome'],
    colorScheme: 'dark',
    // Tall enough that the three device sections on Home (each `flex: 1 1 0;
    // min-height: 220px` — see Home.module.css) aren't squeezed down to their
    // floor, which clips a panel's switch grid against its card's
    // `overflow: hidden` rounded corners.
    viewport: { width: 1280, height: 1080 },
    deviceScaleFactor: 2, // crisp, retina-resolution PNGs
  },
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
