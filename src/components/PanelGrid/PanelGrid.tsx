import {
  type ButtonState,
  ccwButton,
  cwButton,
  ENCODER_LABELS,
  PANEL_LAYOUT,
  pushButton,
  switchButton,
} from '~/panel'
import { Encoder } from '../Encoder/Encoder'
import { PanelCard } from '../PanelCard'
import { SwitchBtn } from '../SwitchBtn/SwitchBtn'
import styles from './PanelGrid.module.css'

interface Props {
  buttons: ButtonState[]
}

export function PanelGrid({ buttons }: Props) {
  return (
    <div className={styles.grid}>
      {PANEL_LAYOUT.map((cell) => {
        const key = `${cell.kind}-${cell.index}`
        if (cell.kind === 'switch') {
          const sw = buttons[switchButton(cell.index)]
          return (
            <PanelCard key={key} active={sw.pressed}>
              <SwitchBtn index={cell.index} pressed={sw.pressed} count={sw.count} />
            </PanelCard>
          )
        }
        const cw = buttons[cwButton(cell.index)]
        const ccw = buttons[ccwButton(cell.index)]
        const push = buttons[pushButton(cell.index)]
        return (
          <PanelCard key={key} active={cw.pressed || ccw.pressed || push.pressed}>
            <Encoder label={ENCODER_LABELS[cell.index]} cw={cw} ccw={ccw} push={push} />
          </PanelCard>
        )
      })}
    </div>
  )
}
