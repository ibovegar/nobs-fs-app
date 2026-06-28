import { useMemo } from 'react'
import { EventLog, Section } from '~/components'
import type { EventLogState } from '~/hooks'
import styles from './Events.module.css'

interface Props {
  autopilot: EventLogState
  approach: EventLogState
  panel: EventLogState
}

export function Events({ autopilot, approach, panel }: Props) {
  // Each device's log entries carry source-namespaced keys, so the streams
  // merge into one newest-first list by timestamp without collision.
  const log = useMemo(
    () => [...autopilot.log, ...approach.log, ...panel.log].sort((a, b) => b.ts - a.ts),
    [autopilot.log, approach.log, panel.log],
  )

  return (
    <Section label="EVENT LOG" className={styles.fill}>
      <EventLog
        log={log}
        isConnected={autopilot.isConnected || approach.isConnected || panel.isConnected}
      />
    </Section>
  )
}
