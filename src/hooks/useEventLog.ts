import { useCallback, useRef, useState } from 'react'
import type { LogEntry } from '~/components'
import { ccwButton, cwButton, DEVICES, decodeButton, ENCODER_LABELS } from '~/panel'
import { type GamepadEvent, useGamepad } from './useGamepad'

const MAX_LOG = 60

export interface EventLogState {
  log: LogEntry[]
  isConnected: boolean
  buttons: ReturnType<typeof useGamepad>['buttons']
}

export function useEventLog(): EventLogState {
  const [log, setLog] = useState<LogEntry[]>([])
  const seq = useRef(0)
  const resetCountsRef = useRef<(indices: number[]) => void>(() => {})

  const addLog = useCallback((entry: Omit<LogEntry, 'key'>) => {
    setLog((prev) => [{ ...entry, key: seq.current++ }, ...prev].slice(0, MAX_LOG))
  }, [])

  const handleEvent = useCallback(
    (ev: GamepadEvent) => {
      const control = decodeButton(ev.id)
      if (control.kind === 'switch') {
        addLog({
          ts: ev.time,
          text: `SW ${control.index + 1}    ${ev.type === 'press' ? 'PRESSED' : 'RELEASED'}`,
          kind: ev.type,
        })
      } else if (control.kind === 'encoder-push' && ev.type === 'press') {
        resetCountsRef.current([cwButton(control.index), ccwButton(control.index)])
        addLog({
          ts: ev.time,
          text: `${ENCODER_LABELS[control.index]}    PUSH  (reset)`,
          kind: 'press',
        })
      } else if (control.kind === 'encoder' && ev.type === 'press') {
        addLog({
          ts: ev.time,
          text: `${ENCODER_LABELS[control.index]}    ${control.dir === 'cw' ? '▶  CW' : '◀  CCW'}`,
          kind: control.dir,
        })
      }
    },
    [addLog],
  )

  const gp = useGamepad(DEVICES.autopilot, handleEvent)
  resetCountsRef.current = gp.resetCounts

  return { log, isConnected: gp.isConnected, buttons: gp.buttons }
}
