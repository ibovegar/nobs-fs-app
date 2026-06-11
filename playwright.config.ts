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
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2, // crisp, retina-resolution PNGs
  },
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
