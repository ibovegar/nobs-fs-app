import { EventLog, Section } from '~/components'
import type { EventLogState } from '~/hooks'
import styles from './Events.module.css'

interface Props {
  autopilot: EventLogState
}

export function Events({ autopilot }: Props) {
  return (
    <Section label="EVENT LOG" className={styles.fill}>
      <EventLog log={autopilot.log} isConnected={autopilot.isConnected} />
    </Section>
  )
}
