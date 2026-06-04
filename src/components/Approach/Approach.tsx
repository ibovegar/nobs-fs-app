import { PanelCard } from '../PanelCard'
import { SwitchBtn } from '../SwitchBtn/SwitchBtn'
import styles from './Approach.module.css'

// Placeholder switches — Nobs Approach is not yet wired to hardware.
const SWITCHES = ['sw1', 'sw2', 'sw3', 'sw4', 'sw5', 'sw6']

export function Approach() {
  return (
    <div className={styles.grid}>
      {SWITCHES.map((id, i) => (
        <PanelCard key={id} active={false}>
          <SwitchBtn index={i} pressed={false} count={0} />
        </PanelCard>
      ))}
    </div>
  )
}
