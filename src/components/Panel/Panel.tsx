import type { ButtonState } from '~/panel'
import { PanelCard } from '../PanelCard'
import { SwitchBtn } from '../SwitchBtn/SwitchBtn'
import styles from './Panel.module.css'

// Stable cell keys — Nobs Panel exposes 6 switches.
const SWITCHES = ['sw1', 'sw2', 'sw3', 'sw4', 'sw5', 'sw6']

interface Props {
  buttons: ButtonState[]
}

export function Panel({ buttons }: Props) {
  return (
    <div className={styles.grid}>
      {SWITCHES.map((id, i) => {
        const b = buttons[i]
        return (
          <PanelCard key={id} active={b.pressed}>
            <SwitchBtn index={i} pressed={b.pressed} count={b.count} />
          </PanelCard>
        )
      })}
    </div>
  )
}
