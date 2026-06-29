import { useCallback, useEffect, useRef, useState } from 'react'
import { getDriver } from '~/io'
import type { ButtonState, DeviceConfig } from '~/panel'
import { type DeviceEvent, freshButtons, initialSyncState, reduceSnapshot } from './deviceSync'

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
export function useDevice(
  device: DeviceConfig | null,
  onEvent?: (ev: DeviceEvent) => void,
): DeviceState {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  // A null device (no module present for this product) watches nothing and
  // stays disconnected — used in native mode where a card only exists while its
  // device is plugged in.
  const buttonCount = device?.buttonCount ?? 0
  const syncRef = useRef(initialSyncState(buttonCount))
  const [view, setView] = useState<{ isConnected: boolean; buttons: ButtonState[] }>(() => ({
    isConnected: syncRef.current.isConnected,
    buttons: syncRef.current.buttons,
  }))

  useEffect(() => {
    syncRef.current = initialSyncState(buttonCount)
    setView({ isConnected: false, buttons: syncRef.current.buttons })
    if (!device) return
    const driver = getDriver()
    return driver.watch(device, (snap) => {
      const { state, events, changed } = reduceSnapshot(syncRef.current, snap, Date.now())
      syncRef.current = state
      for (const ev of events) onEventRef.current?.(ev)
      if (changed) setView({ isConnected: state.isConnected, buttons: state.buttons })
    })
  }, [device, buttonCount])

  const resetCounts = useCallback((indices: number[]) => {
    const buttons = syncRef.current.buttons.map((b, i) =>
      indices.includes(i) ? { ...b, count: 0, lastPress: 0 } : b,
    )
    syncRef.current = { ...syncRef.current, buttons }
    setView((prev) => ({ ...prev, buttons }))
  }, [])

  // `view` lags the live `buttonCount` by one render when the device changes
  // (the effect that resyncs state runs after this render): on the render where
  // a product flips from absent → present, `view.buttons` is still the previous,
  // shorter array. Hand back a correctly-sized fresh array in that gap so
  // consumers that index by button position (PanelGrid, Panel, Approach) never
  // hit an undefined entry. Once the effect has run the lengths match and the
  // real, live array is returned unchanged.
  const buttons = view.buttons.length === buttonCount ? view.buttons : freshButtons(buttonCount)
  return { isConnected: view.isConnected, buttons, resetCounts }
}
