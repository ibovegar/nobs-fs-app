import { useMemo } from 'react'
import { EventLog, Section } from '~/components'
import type { EventLogState } from '~/hooks'
import styles from './Events.module.css'

interface Props {
  autopilot: EventLogState
  panel: EventLogState
}

export function Events({ autopilot, panel }: Props) {
  // Each device's log entries carry source-namespaced keys, so the two streams
  // merge into one newest-first list by timestamp without collision.
  const log = useMemo(
    () => [...autopilot.log, ...panel.log].sort((a, b) => b.ts - a.ts),
    [autopilot.log, panel.log],
  )

  return (
    <Section label="EVENT LOG" className={styles.fill}>
      <EventLog log={log} isConnected={autopilot.isConnected || panel.isConnected} />
    </Section>
  )
}
