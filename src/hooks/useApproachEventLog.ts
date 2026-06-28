import { useCallback } from 'react'
import type { LogEntry } from '~/components'
import { DEVICES } from '~/panel'
import { type DeviceEvent, useDevice } from './useDevice'
import { useEventBuffer } from './useEventBuffer'
import type { EventLogState } from './useEventLog'

// Nobs Approach button → log entry. Each control is a button pair (see Approach
// component): flaps up/down, gear up/down, and the parking brake (terminals
// wired inverted — button 4 is pushed-in/released, button 5 pulled-out/set).
const ENTRIES: Record<number, { text: string; kind: LogEntry['kind'] }> = {
  0: { text: 'FLAPS    UP', kind: 'cw' },
  1: { text: 'FLAPS    DOWN', kind: 'ccw' },
  2: { text: 'GEAR    UP', kind: 'cw' },
  3: { text: 'GEAR    DOWN', kind: 'ccw' },
  4: { text: 'PARK BRK    RELEASED', kind: 'release' },
  5: { text: 'PARK BRK    SET', kind: 'press' },
}

export function useApproachEventLog(): EventLogState {
  const { log, addLog } = useEventBuffer('approach')

  const handleEvent = useCallback(
    (ev: DeviceEvent) => {
      // Log the actuation (terminal closing); releases are implied by the next press.
      if (ev.type !== 'press') return
      const entry = ENTRIES[ev.id]
      if (entry) addLog({ ts: ev.time, text: entry.text, kind: entry.kind })
    },
    [addLog],
  )

  const dev = useDevice(DEVICES.approach, handleEvent)
  return { log, isConnected: dev.isConnected, buttons: dev.buttons }
}
