import { gamepadDriver } from './gamepadDriver'
import { nativeDriver } from './nativeDriver'
import type { DeviceDriver } from './types'
import { webhidDriver, webhidSupported } from './webhidDriver'

// Runtime (not build-time) detection, so one bundle works in every shell.
const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

function pick(): DeviceDriver {
  if (isTauri()) return nativeDriver // native: auto-detect, zero interaction
  if (webhidSupported()) return webhidDriver // Chromium: auto-detect after one grant
  return gamepadDriver // fallback: needs the user to actuate a control
}

let cached: DeviceDriver | null = null

/** The active input driver for this environment. */
export function getDriver(): DeviceDriver {
  if (!cached) cached = pick()
  return cached
}
