import { gamepadDriver } from './gamepadDriver'
import { nativeDriver } from './nativeDriver'
import type { DeviceDriver } from './types'

// Runtime (not build-time) detection, so one bundle works in both shells.
const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

let cached: DeviceDriver | null = null

/** The active input driver for this environment: native in Tauri, else Gamepad API. */
export function getDriver(): DeviceDriver {
  if (!cached) cached = isTauri() ? nativeDriver : gamepadDriver
  return cached
}
