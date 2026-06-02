import { useState, useEffect, useRef } from 'react'
import { BUTTON_COUNT, type ButtonState } from '~/panel'

export interface GamepadEvent {
  id: number
  time: number
  type: 'press' | 'release'
}

export interface GamepadState {
  isConnected: boolean
  buttons: ButtonState[]
}

const freshButtons = (): ButtonState[] =>
  Array.from({ length: BUTTON_COUNT }, () => ({ pressed: false, lastPress: 0, count: 0 }))

export function useGamepad(onEvent: (ev: GamepadEvent) => void): GamepadState {
  const [state, setState] = useState<GamepadState>(() => ({
    isConnected: false,
    buttons: freshButtons(),
  }))

  const rafRef = useRef<number>(0)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    const poll = () => {
      const gps = navigator.getGamepads?.() ?? []
      const gp = Array.from(gps).find((g): g is Gamepad => g !== null) ?? null

      if (gp) {
        const now = Date.now()
        setState(prev => {
          let changed = !prev.isConnected

          const buttons = prev.buttons.map((b, i) => {
            const pressed = i < gp.buttons.length ? gp.buttons[i].pressed : false
            if (pressed === b.pressed) return b

            changed = true
            if (pressed) {
              onEventRef.current({ id: i, time: now, type: 'press' })
              return { pressed: true, lastPress: now, count: b.count + 1 }
            }
            onEventRef.current({ id: i, time: now, type: 'release' })
            return { ...b, pressed: false }
          })

          return changed ? { isConnected: true, buttons } : prev
        })
      } else {
        setState(prev => {
          if (!prev.isConnected) return prev
          return {
            isConnected: false,
            buttons: prev.buttons.map(b => (b.pressed ? { ...b, pressed: false } : b)),
          }
        })
      }

      rafRef.current = requestAnimationFrame(poll)
    }

    rafRef.current = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return state
}
