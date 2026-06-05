import { useCallback, useEffect, useRef, useState } from 'react'
import { getDriver } from '~/io'
import type { ButtonState, DeviceConfig } from '~/panel'

export interface DeviceEvent {
  id: number
  time: number
  type: 'press' | 'release'
}

export interface DeviceState {
  isConnected: boolean
  buttons: ButtonState[]
  resetCounts: (indices: number[]) => void
}

const freshButtons = (count: number): ButtonState[] =>
  Array.from({ length: count }, () => ({ pressed: false, lastPress: 0, count: 0 }))

/**
 * Backend-agnostic device hook. Gets raw `pressed[]` snapshots from the active
 * driver (Gamepad API on the web, native HID in Tauri) and does the press/
 * release edge detection, press counting, and event emission on top — so the
 * behaviour is identical regardless of how the bits arrive.
 */
export function useDevice(device: DeviceConfig, onEvent?: (ev: DeviceEvent) => void): DeviceState {
  const [state, setState] = useState<{ isConnected: boolean; buttons: ButtonState[] }>(() => ({
    isConnected: false,
    buttons: freshButtons(device.buttonCount),
  }))

  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    const driver = getDriver()
    return driver.watch(device, ({ connected, pressed }) => {
      const now = Date.now()
      setState((prev) => {
        if (!connected) {
          if (!prev.isConnected) return prev
          return {
            isConnected: false,
            buttons: prev.buttons.map((b) => (b.pressed ? { ...b, pressed: false } : b)),
          }
        }

        let changed = !prev.isConnected
        const buttons = prev.buttons.map((b, i) => {
          const isDown = pressed[i] ?? false
          if (isDown === b.pressed) return b

          changed = true
          if (isDown) {
            onEventRef.current?.({ id: i, time: now, type: 'press' })
            return { pressed: true, lastPress: now, count: b.count + 1 }
          }
          onEventRef.current?.({ id: i, time: now, type: 'release' })
          return { ...b, pressed: false }
        })

        return changed ? { isConnected: true, buttons } : prev
      })
    })
  }, [device])

  const resetCounts = useCallback((indices: number[]) => {
    setState((prev) => ({
      ...prev,
      buttons: prev.buttons.map((b, i) =>
        indices.includes(i) ? { ...b, count: 0, lastPress: 0 } : b,
      ),
    }))
  }, [])

  return { ...state, resetCounts }
}
