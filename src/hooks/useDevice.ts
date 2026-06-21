import { useCallback, useEffect, useRef, useState } from 'react'
import { getDriver } from '~/io'
import type { ButtonState, DeviceConfig } from '~/panel'
import { type DeviceEvent, initialSyncState, reduceSnapshot } from './deviceSync'

export type { DeviceEvent }

export interface DeviceState {
  isConnected: boolean
  buttons: ButtonState[]
  resetCounts: (indices: number[]) => void
}

/**
 * Backend-agnostic device hook. Gets raw `pressed[]` snapshots from the active
 * driver (Gamepad API on the web, WebHID auto-detect, native HID in Tauri) and
 * runs them through `reduceSnapshot` for press/release edge detection, press
 * counting, debouncing, and event emission — identical regardless of how the
 * bits arrive. The full edge-detection state lives in a ref (only the
 * React-visible slice is mirrored into state) so the reducer stays pure and
 * StrictMode's double-invoked render doesn't double-emit events.
 */
export function useDevice(device: DeviceConfig, onEvent?: (ev: DeviceEvent) => void): DeviceState {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const syncRef = useRef(initialSyncState(device.buttonCount))
  const [view, setView] = useState<{ isConnected: boolean; buttons: ButtonState[] }>(() => ({
    isConnected: syncRef.current.isConnected,
    buttons: syncRef.current.buttons,
  }))

  useEffect(() => {
    syncRef.current = initialSyncState(device.buttonCount)
    const driver = getDriver()
    return driver.watch(device, (snap) => {
      const { state, events, changed } = reduceSnapshot(syncRef.current, snap, Date.now())
      syncRef.current = state
      for (const ev of events) onEventRef.current?.(ev)
      if (changed) setView({ isConnected: state.isConnected, buttons: state.buttons })
    })
  }, [device])

  const resetCounts = useCallback((indices: number[]) => {
    const buttons = syncRef.current.buttons.map((b, i) =>
      indices.includes(i) ? { ...b, count: 0, lastPress: 0 } : b,
    )
    syncRef.current = { ...syncRef.current, buttons }
    setView((prev) => ({ ...prev, buttons }))
  }, [])

  return { ...view, resetCounts }
}
