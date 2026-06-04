import { useCallback, useRef, useState } from 'react'
import approachImg from '~/assets/images/nobs_approach.svg'
import autopilotImg from '~/assets/images/nobs_autopilot.png'
import panelImg from '~/assets/images/nobs_panel.svg'
import type { LogEntry } from '~/components'
import {
  Approach,
  EventLog,
  Header,
  Panel,
  PanelGrid,
  ProductCard,
  ProductImage,
  Section,
} from '~/components'
import { type GamepadEvent, useGamepad } from '~/hooks'
import { ccwButton, cwButton, decodeButton, ENCODER_LABELS } from '~/panel'
import styles from './App.module.css'

const MAX_LOG = 60

export default function App() {
  const [log, setLog] = useState<LogEntry[]>([])
  const seq = useRef(0)
  const resetCountsRef = useRef<(indices: number[]) => void>(() => {})

  const addLog = useCallback((entry: Omit<LogEntry, 'key'>) => {
    setLog((prev) => [{ ...entry, key: seq.current++ }, ...prev].slice(0, MAX_LOG))
  }, [])

  const handleEvent = useCallback(
    (ev: GamepadEvent) => {
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

  const gp = useGamepad(handleEvent)
  resetCountsRef.current = gp.resetCounts

  return (
    <div className={styles.panel}>
      <Header />
      <main className={styles.body}>
        <Section>
          <ProductCard>
            <ProductImage name="Nobs Autopilot" image={autopilotImg} />
            <PanelGrid buttons={gp.buttons} />
          </ProductCard>
        </Section>
        <Section>
          <ProductCard>
            <ProductImage name="Nobs Approach" image={approachImg} />
            <Approach />
          </ProductCard>
        </Section>
        <Section>
          <ProductCard>
            <ProductImage name="Nobs Panel" image={panelImg} />
            <Panel />
          </ProductCard>
        </Section>
        <Section label="EVENT LOG">
          <EventLog log={log} isConnected={gp.isConnected} />
        </Section>
      </main>
    </div>
  )
}
