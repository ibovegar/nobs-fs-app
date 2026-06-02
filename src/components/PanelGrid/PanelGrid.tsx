import { PanelCard } from '../PanelCard'
import { Encoder } from '../Encoder/Encoder'
import { SwitchBtn } from '../SwitchBtn/SwitchBtn'
import { PANEL_LAYOUT, ENCODER_LABELS, cwButton, ccwButton, type ButtonState } from '~/panel'
import styles from './PanelGrid.module.css'

interface Props {
  buttons: ButtonState[]
}

export function PanelGrid({ buttons }: Props) {
  return (
    <div className={styles.grid}>
      {PANEL_LAYOUT.map((cell, idx) => {
        if (cell.kind === 'switch') {
          const sw = buttons[cell.index]
          return (
            <PanelCard key={idx} active={sw.pressed}>
              <SwitchBtn index={cell.index} pressed={sw.pressed} count={sw.count} />
            </PanelCard>
          )
        }
        const cw = buttons[cwButton(cell.index)]
        const ccw = buttons[ccwButton(cell.index)]
        return (
          <PanelCard key={idx} active={cw.pressed || ccw.pressed}>
            <Encoder label={ENCODER_LABELS[cell.index]} cw={cw} ccw={ccw} />
          </PanelCard>
        )
      })}
    </div>
  )
}
