import { useMemo } from 'react'
import { EventLog, Section } from '~/components'
import type { EventLogState, WindyControl } from '~/hooks'
import styles from './Events.module.css'

interface Props {
  autopilot: EventLogState
  approach: EventLogState
  panel: EventLogState
  windy: WindyControl
}

export function Events({ autopilot, approach, panel, windy }: Props) {
  // Each device's log entries carry source-namespaced keys, so the streams
  // merge into one newest-first list by timestamp without collision. Windy's
  // entries come from its serial state pushes rather than HID buttons, but they
  // land in the same shape and merge like any other source.
  const log = useMemo(
    () =>
      [...autopilot.log, ...approach.log, ...panel.log, ...windy.log].sort((a, b) => b.ts - a.ts),
    [autopilot.log, approach.log, panel.log, windy.log],
  )

  return (
    <Section label="EVENT LOG" className={styles.fill}>
      <EventLog
        log={log}
        isConnected={
          autopilot.isConnected || approach.isConnected || panel.isConnected || windy.isConnected
        }
      />
    </Section>
  )
}
