import { test } from '@playwright/test'

// Generates the README screenshots. Run with `pnpm screenshots`.
// Each shot suppresses the first-run welcome overlay and pins dark mode via localStorage,
// then captures a full-page PNG into `docs/`.

const SHOTS = [
  { path: '/', file: 'docs/screenshot-home.png' },
  { path: '/autopilot/settings', file: 'docs/screenshot-autopilot-settings.png' },
] as const

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('nobs.welcomeSeen', '1')
    localStorage.setItem('nobs.themeMode', 'dark')
  })
})

for (const { path, file } of SHOTS) {
  test(`screenshot ${path}`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    // Round the app container and make the page background transparent so the
    // clipped corners are baked into the PNG (GitHub strips CSS from README HTML).
    await page.addStyleTag({
      content: `
        html, body { background: transparent !important; }
        #root > div { border-radius: 16px; }
      `,
    })
    // Let fonts settle and any entrance animations finish before capturing.
    await page.waitForTimeout(500)
    await page.locator('#root > div').screenshot({ path: file, omitBackground: true })
  })
}
