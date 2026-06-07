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

  // Authoritative button state for edge detection. Kept in a ref (not derived
  // from setState's `prev`) so the updater stays pure — under StrictMode React
  // double-invokes updaters, so emitting events from inside one fires them
  // twice. We compute edges/events here and hand setState a ready-made value.
  const buttonsRef = useRef(state.buttons)
  const connectedRef = useRef(state.isConnected)

  useEffect(() => {
    const driver = getDriver()
    return driver.watch(device, ({ connected, pressed }) => {
      const now = Date.now()
      const prevButtons = buttonsRef.current

      if (!connected) {
        if (!connectedRef.current) return
        connectedRef.current = false
        const buttons = prevButtons.map((b) => (b.pressed ? { ...b, pressed: false } : b))
        buttonsRef.current = buttons
        setState({ isConnected: false, buttons })
        return
      }

      let changed = !connectedRef.current
      const buttons = prevButtons.map((b, i) => {
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

      if (!changed) return
      connectedRef.current = true
      buttonsRef.current = buttons
      setState({ isConnected: true, buttons })
    })
  }, [device])

  const resetCounts = useCallback((indices: number[]) => {
    const buttons = buttonsRef.current.map((b, i) =>
      indices.includes(i) ? { ...b, count: 0, lastPress: 0 } : b,
    )
    buttonsRef.current = buttons
    setState((prev) => ({ ...prev, buttons }))
  }, [])

  return { ...state, resetCounts }
}
