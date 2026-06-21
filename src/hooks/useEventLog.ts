import { useCallback, useRef } from 'react'
import type { LogEntry } from '~/components'
import { ccwButton, cwButton, DEVICES, decodeButton, ENCODER_LABELS } from '~/panel'
import { type DeviceEvent, useDevice } from './useDevice'
import { useEventBuffer } from './useEventBuffer'

export interface EventLogState {
  log: LogEntry[]
  isConnected: boolean
  buttons: ReturnType<typeof useDevice>['buttons']
}

export function useEventLog(): EventLogState {
  const { log, addLog } = useEventBuffer('autopilot')
  const resetCountsRef = useRef<(indices: number[]) => void>(() => {})

  const handleEvent = useCallback(
    (ev: DeviceEvent) => {
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

  const gp = useDevice(DEVICES.autopilot, handleEvent)
  resetCountsRef.current = gp.resetCounts

  return { log, isConnected: gp.isConnected, buttons: gp.buttons }
}
