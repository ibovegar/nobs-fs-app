import { useCallback } from 'react'
import { DEVICES, type DeviceConfig, decodeYokeButton } from '~/panel'
import { type DeviceEvent, useDevice } from './useDevice'
import { useEventBuffer } from './useEventBuffer'
import type { EventLogState } from './useEventLog'

export function useYokeEventLog(device: DeviceConfig | null = DEVICES.yoke): EventLogState {
  const { log, addLog } = useEventBuffer('yoke')

  const handleEvent = useCallback(
    (ev: DeviceEvent) => {
      const control = decodeYokeButton(ev.id)
      if (!control) return
      if (control.kind === 'push') {
        addLog({
          ts: ev.time,
          text: `${control.label}    ${ev.type === 'press' ? 'PRESSED' : 'RELEASED'}`,
          kind: ev.type,
        })
      } else if (ev.type === 'press') {
        addLog({
          ts: ev.time,
          text: `${control.label}    ${control.terminal === 'up' ? 'UP' : 'DOWN'}`,
          kind: control.terminal === 'up' ? 'cw' : 'ccw',
        })
      } else {
        // The trim switches are momentary: a release means the lever sprang back
        // to the centre (OFF) position.
        addLog({ ts: ev.time, text: `${control.label}    CENTER`, kind: 'release' })
      }
    },
    [addLog],
  )

  const dev = useDevice(device, handleEvent)
  return { log, isConnected: dev.isConnected, buttons: dev.buttons }
}
