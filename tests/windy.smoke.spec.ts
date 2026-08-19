import { expect, test } from '@playwright/test'

// Smoke checks for the Windy serial link. Windy is the only module the app can
// *drive* rather than just observe, and the only one whose transport is a two-way
// serial port, so these stub `navigator.serial` with a fake board speaking the
// documented protocol (nobs-fs-windy/docs/serial-protocol.md). That exercises the
// whole web path — windySerial's read loop → parseWindyLine → useWindy → the
// Windy UI, and commands back out — with no hardware attached.
//
// The fake mirrors the real sketch's two awkward behaviours: it answers `STATE:`
// only when something actually changes, and it can be made deaf for the first few
// commands, the way the Uno's bootloader swallows anything sent right after the
// port opens (opening asserts DTR, which resets the board).

interface StubOpts {
  deafFor: number
  /** Whether the port is already granted (a returning user) or needs the picker. */
  granted?: boolean
  /** USB ids the board reports — clones are not the stock Uno pair. */
  ids?: { usbVendorId: number; usbProductId: number }
}

const STUB = ({ deafFor, granted = true, ids }: StubOpts) => {
  localStorage.setItem('nobs.welcomeSeen', '1')
  localStorage.setItem('nobs.themeMode', 'dark')

  const info = ids ?? { usbVendorId: 0x2341, usbProductId: 0x0043 }
  let power = 'ON'
  let level = 3
  let seen = 0
  let push: (s: string) => void = () => {}

  // Records port ownership so a test can assert the app actually let go — while it
  // holds the port, avrdude can't flash the board.
  const held = { open: false }
  Object.defineProperty(window, '__windyPortOpen', { get: () => held.open })

  // Real Web Serial hands out a fresh `readable` on every open(), so a port that
  // was closed and reopened streams again. Building it once instead would make a
  // reconnect-after-disconnect look broken when it isn't.
  let stream: ReadableStream<Uint8Array> | null = null

  const port = {
    getInfo: () => info,
    open: async () => {
      held.open = true
      stream = new ReadableStream<Uint8Array>({
        start(controller) {
          push = (s) => controller.enqueue(new TextEncoder().encode(s))
        },
      })
    },
    close: async () => {
      held.open = false
      stream = null
    },
    get readable() {
      return stream
    },
    writable: new WritableStream<Uint8Array>({
      write(chunk) {
        const line = new TextDecoder().decode(chunk).trim()
        // Still in the bootloader — the command is simply lost, no reply.
        if (seen++ < deafFor) return

        if (line === 'GET_ID') push('ID:80FC:Nobs Windy\n') // sketch prints uppercase hex
        else if (line === 'GET_STATE') push(`STATE:${power}:${level}\r\n`) // println → CRLF
        else if (line.startsWith('SET_POWER:')) {
          const next = line.slice('SET_POWER:'.length)
          if (next === power) return // firmware returns early when unchanged
          power = next
          push(`STATE:${power}:${level}\r\n`)
        } else if (line.startsWith('SET_SPEED:')) {
          const next = Math.max(1, Math.min(5, Number(line.slice('SET_SPEED:'.length))))
          if (next === level) return // ditto
          level = next
          push(`STATE:${power}:${level}\r\n`)
        } else push(`ERR:${line}\n`)
      },
    }),
  }

  const serial = new EventTarget() as EventTarget & Record<string, unknown>
  serial.getPorts = async () => (granted ? [port] : [])
  // Faithful to Chrome: a filter the board doesn't match leaves the picker empty,
  // and the user can only dismiss it — which surfaces as a rejection. There is no
  // way for them to see past the filter.
  serial.requestPort = async (options?: { filters?: { usbVendorId?: number }[] }) => {
    const filters = options?.filters
    const matches =
      !filters ||
      filters.some(
        (f) =>
          f.usbVendorId === info.usbVendorId &&
          (f as { usbProductId?: number }).usbProductId === info.usbProductId,
      )
    if (!matches) throw new DOMException('No port selected by the user.', 'NotFoundError')
    return port
  }
  Object.defineProperty(navigator, 'serial', { value: serial, configurable: true })
}

// The Devices page carries a Connect button per module, so Windy's has to be
// picked out by the row's USB id rather than by button text alone.
const windyRow = (page: import('@playwright/test').Page) =>
  page.locator('li').filter({ hasText: '2341:0043' })

test('windy card comes up and drives the device', async ({ page }) => {
  await page.addInitScript(STUB, { deafFor: 0 })
  await page.goto('/')

  // The link waits out the Uno's DTR reset (2 s) before reporting up.
  const card = page.locator('section', { hasText: 'Nobs Windy' })
  await expect(card.getByText('LEVEL 3')).toBeVisible({ timeout: 15_000 })
  await expect(card.getByRole('button', { name: 'ON', exact: true })).toBeVisible()

  // Drive it: the reply from the fake device is what lands in the UI.
  await card.getByRole('button', { name: 'Increase fan speed' }).click()
  await expect(card.getByText('LEVEL 4')).toBeVisible()

  await card.getByRole('button', { name: 'ON', exact: true }).click()
  await expect(card.getByRole('button', { name: 'OFF', exact: true })).toBeVisible()

  // In-app navigation only — a page.goto would remount App, resetting the log
  // buffer and reopening the link.
  await page.getByRole('link', { name: 'Event log' }).click()
  await expect(page.getByText(/FAN\s+OFF/)).toBeVisible()
  await expect(page.getByText(/SPEED.*LEVEL 4/)).toBeVisible()

  // And the identity from GET_ID drives the settings page.
  await page.getByRole('link', { name: 'Home' }).click()
  await card.getByRole('link', { name: 'Settings' }).click()
  await expect(page.getByText(/module reports 80fc/)).toBeVisible()
  await expect(page.getByRole('textbox')).toHaveValue('Nobs Windy')
})

test('connects a clone board whose USB ids are not the stock Uno pair', async ({ page }) => {
  // A CH340-bridged Uno clone — a perfectly good Windy that shares none of the
  // stock `2341:0043` identity. Filtering the picker on those ids left this user
  // with an empty picker and a Connect button that did nothing.
  await page.addInitScript(STUB, {
    deafFor: 0,
    granted: false,
    ids: { usbVendorId: 0x1a86, usbProductId: 0x7523 },
  })
  await page.goto('/')

  // Connecting lives on the Devices page, with every other module's setup — the
  // Home card only mirrors state and points there.
  const card = page.locator('section', { hasText: 'Nobs Windy' })
  await expect(card.getByRole('button', { name: 'Connect' })).toBeHidden()
  await expect(card.getByText(/Connect Windy on the Devices page/)).toBeVisible()

  await page.getByRole('link', { name: 'Devices' }).click()
  await windyRow(page).getByRole('button', { name: 'Connect' }).click()

  await page.getByRole('link', { name: 'Home' }).click()
  await expect(card.getByText('LEVEL 3')).toBeVisible({ timeout: 20_000 })
  await expect(card.getByRole('button', { name: 'ON', exact: true })).toBeEnabled()
})

test('releases the COM port on disconnect so the board can be flashed', async ({ page }) => {
  await page.addInitScript(STUB, { deafFor: 0 })
  await page.goto('/')

  const card = page.locator('section', { hasText: 'Nobs Windy' })
  await expect(card.getByText('LEVEL 3')).toBeVisible({ timeout: 20_000 })
  expect(await page.evaluate(() => (window as never as { __windyPortOpen: boolean })
    .__windyPortOpen)).toBe(true)

  await page.getByRole('link', { name: 'Devices' }).click()
  await windyRow(page).getByRole('button', { name: 'Disconnect' }).click()

  // The port must actually be closed, not merely shown as disconnected — a card
  // that says "not connected" while still holding the handle is the bug.
  await expect
    .poll(() =>
      page.evaluate(() => (window as never as { __windyPortOpen: boolean }).__windyPortOpen),
    )
    .toBe(false)

  // And it must stay released: nothing may silently re-take it on a re-render.
  await page.getByRole('link', { name: 'Home' }).click()
  await page.waitForTimeout(1500)
  expect(await page.evaluate(() => (window as never as { __windyPortOpen: boolean })
    .__windyPortOpen)).toBe(false)

  // Reconnecting after the upload brings the link back — again from Devices.
  await page.getByRole('link', { name: 'Devices' }).click()
  await windyRow(page).getByRole('button', { name: 'Connect' }).click()
  await page.getByRole('link', { name: 'Home' }).click()
  await expect(card.getByText('LEVEL 3')).toBeVisible({ timeout: 20_000 })
})

test('recovers when the opening probe is lost to the bootloader', async ({ page }) => {
  // Swallow the first four commands — enough to eat the opening GET_STATE and
  // GET_ID plus a retry. The sketch only reports state on change, so without the
  // probe retry the controls would stay disabled forever with nothing to explain
  // it, which is exactly what "nothing happens when I press the buttons" looked
  // like.
  await page.addInitScript(STUB, { deafFor: 4 })
  await page.goto('/')

  const card = page.locator('section', { hasText: 'Nobs Windy' })
  await expect(card.getByText('LEVEL 3')).toBeVisible({ timeout: 20_000 })

  const power = card.getByRole('button', { name: 'ON', exact: true })
  await expect(power).toBeEnabled()
  await power.click()
  await expect(card.getByRole('button', { name: 'OFF', exact: true })).toBeVisible()
})
