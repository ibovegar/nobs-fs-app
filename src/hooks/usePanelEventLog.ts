import { useCallback } from 'react'
import { DEVICES, type DeviceConfig, decodePanelButton, PANEL_SWITCHES } from '~/panel'
import { type DeviceEvent, useDevice } from './useDevice'
import { useEventBuffer } from './useEventBuffer'
import type { EventLogState } from './useEventLog'

export function usePanelEventLog(device: DeviceConfig = DEVICES.panel): EventLogState {
  const { log, addLog } = useEventBuffer('panel')

  const handleEvent = useCallback(
    (ev: DeviceEvent) => {
      const { switchIndex, terminal } = decodePanelButton(ev.id)
      const sw = PANEL_SWITCHES[switchIndex]
      if (ev.type === 'press') {
        addLog({
          ts: ev.time,
          text: `${sw.label}    ${terminal === 'up' ? 'UP' : 'DOWN'}`,
          kind: terminal === 'up' ? 'cw' : 'ccw',
        })
      } else if (sw.kind === 'on-off-on') {
        // Releasing a 3-position switch without the other terminal closing means
        // the lever rested at the centre (OFF) position.
        addLog({ ts: ev.time, text: `${sw.label}    CENTER`, kind: 'release' })
      }
    },
    [addLog],
  )

  const dev = useDevice(device, handleEvent)
  return { log, isConnected: dev.isConnected, buttons: dev.buttons }
}
