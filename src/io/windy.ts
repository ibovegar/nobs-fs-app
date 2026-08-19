// Environment-aware Windy serial link. The web build talks to the board over Web
// Serial (`windySerial`); the native build goes through Rust (`windyNative`),
// since WebView2 has no Web Serial. Same surface either way, so `useWindy` — and
// everything above it — is environment-agnostic.
//
// Mirrors how `panelConfig` splits the autopilot's config channel, but this link
// is bidirectional and stays open: Windy has no HID interface, so its serial port
// is the only way the app hears about physical button presses.

import { isNative } from './env'
import * as native from './windyNative'
import * as web from './windySerial'

const link = () => (isNative() ? native : web)

/** Whether this environment can talk to Windy at all (web: Chromium only). */
export const windySupported = () => link().windySupported()

/** Whether the link is open right now. */
export const windyConnected = () => link().windyConnected()

/** Why the last connect attempt failed, or null if none has. */
export const windyError = () => link().windyError()

/** Open an already-permitted link without prompting (safe to call on load). */
export const reconnectWindy = () => link().reconnectWindy()

/** Open the link, prompting for a port grant if the environment needs one (web: user gesture). */
export const connectWindy = () => link().connectWindy()

/**
 * Close the link and release the serial port, until the user connects again.
 * Needed because a COM port has a single owner: while the app holds it, the
 * Arduino IDE cannot flash the board.
 */
export const disconnectWindy = () => link().disconnectWindy()

/** Write one already-terminated command line (see `windyCommand`). */
export const sendWindy = (line: string) => link().sendWindy(line)

/** Subscribe to raw lines from the device. Returns an unsubscribe function. */
export const onWindyLine = (cb: (line: string) => void) => link().onWindyLine(cb)

/** Subscribe to link up/down. Returns an unsubscribe function. */
export const onWindyConnection = (cb: (isConnected: boolean) => void) =>
  link().onWindyConnection(cb)

/** Whether a one-time port grant is required before the link can open (web only). */
export const windyNeedsGrant = () => !isNative()
