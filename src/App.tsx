import { useState, useCallback, useRef } from 'react'
import { useGamepad, type GamepadEvent } from '~/hooks'
import { Header, Section, PanelGrid, EventLog } from '~/components'
import type { LogEntry } from '~/components'
import { decodeButton, ENCODER_LABELS } from '~/panel'
import styles from './App.module.css'

const MAX_LOG = 60

export default function App() {
  const [log, setLog] = useState<LogEntry[]>([])
  const seq = useRef(0)

  const addLog = useCallback((entry: Omit<LogEntry, 'key'>) => {
    setLog(prev => [{ ...entry, key: seq.current++ }, ...prev].slice(0, MAX_LOG))
  }, [])

  const handleEvent = useCallback((ev: GamepadEvent) => {
    const control = decodeButton(ev.id)
    if (control.kind === 'switch') {
      addLog({
        ts: ev.time,
        text: `SW ${control.index + 1}    ${ev.type === 'press' ? 'PRESSED' : 'RELEASED'}`,
        kind: ev.type,
      })
    } else if (ev.type === 'press') {
      addLog({
        ts: ev.time,
        text: `${ENCODER_LABELS[control.index]}    ${control.dir === 'cw' ? '▶  CW' : '◀  CCW'}`,
        kind: control.dir,
      })
    }
  }, [addLog])

  const gp = useGamepad(handleEvent)

  return (
    <div className={styles.panel}>
      <Header isConnected={gp.isConnected} />
      <main className={styles.body}>
        <Section label="PANEL">
          <PanelGrid buttons={gp.buttons} />
        </Section>
        <Section label="EVENT LOG">
          <EventLog log={log} isConnected={gp.isConnected} />
        </Section>
      </main>
    </div>
  )
}
