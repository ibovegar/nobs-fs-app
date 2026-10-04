import { useCallback, useRef } from 'react'
import {
  ccwButton,
  cwButton,
  DEVICES,
  type DeviceConfig,
  decodeLightButton,
  LIGHT_ENCODER_LABELS,
  LIGHT_SWITCHES,
} from '~/panel'
import { type DeviceEvent, useDevice } from './useDevice'
import { useEventBuffer } from './useEventBuffer'
import type { EventLogState } from './useEventLog'

export function useLightEventLog(device: DeviceConfig | null = DEVICES.light): EventLogState {
  const { log, addLog } = useEventBuffer('light')
  const resetCountsRef = useRef<(indices: number[]) => void>(() => {})

  const handleEvent = useCallback(
    (ev: DeviceEvent) => {
      const control = decodeLightButton(ev.id)
      if (control.kind === 'switch') {
        const { label } = LIGHT_SWITCHES[control.index]
        if (ev.type === 'press') {
          addLog({
            ts: ev.time,
            text: `${label}    ${control.terminal === 'up' ? 'UP' : 'DOWN'}`,
            kind: control.terminal === 'up' ? 'cw' : 'ccw',
          })
        } else {
          // Both switches are 3-position: a release means the lever came back to
          // the centre (OFF) position.
          addLog({ ts: ev.time, text: `${label}    CENTER`, kind: 'release' })
        }
      } else if (control.kind === 'encoder-push' && ev.type === 'press') {
        resetCountsRef.current([cwButton(control.index), ccwButton(control.index)])
        addLog({
          ts: ev.time,
          text: `${LIGHT_ENCODER_LABELS[control.index]}    PUSH  (reset)`,
          kind: 'press',
        })
      } else if (control.kind === 'encoder' && ev.type === 'press') {
        addLog({
          ts: ev.time,
          text: `${LIGHT_ENCODER_LABELS[control.index]}    ${control.dir === 'cw' ? '▶  CW' : '◀  CCW'}`,
          kind: control.dir,
        })
      }
    },
    [addLog],
  )

  const dev = useDevice(device, handleEvent)
  resetCountsRef.current = dev.resetCounts

  return { log, isConnected: dev.isConnected, buttons: dev.buttons }
}
