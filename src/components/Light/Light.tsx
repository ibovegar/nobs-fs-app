import {
  type ButtonState,
  ccwButton,
  cwButton,
  LIGHT_ENCODER_LABELS,
  LIGHT_LAYOUT,
  LIGHT_SWITCHES,
  pushButton,
} from '~/panel'
import { Encoder } from '../Encoder/Encoder'
import { PanelCard } from '../PanelCard'
import { ToggleSwitch } from '../ToggleSwitch'
import styles from './Light.module.css'

interface Props {
  buttons: ButtonState[]
}

export function Light({ buttons }: Props) {
  return (
    <div className={styles.grid}>
      {LIGHT_LAYOUT.map((cell) => {
        const key = `${cell.kind}-${cell.index}`
        if (cell.kind === 'switch') {
          const sw = LIGHT_SWITCHES[cell.index]
          const up = buttons[sw.up].pressed
          const down = buttons[sw.down].pressed
          // Both switches are ON-OFF-ON: neither terminal closed = centre (OFF).
          const position = up ? 'up' : down ? 'down' : 'center'
          return (
            <PanelCard key={key} active={up || down}>
              <ToggleSwitch
                label={sw.label}
                position={position}
                active={up || down}
                readout={position.toUpperCase()}
              />
            </PanelCard>
          )
        }
        const cw = buttons[cwButton(cell.index)]
        const ccw = buttons[ccwButton(cell.index)]
        const push = buttons[pushButton(cell.index)]
        return (
          <PanelCard key={key} active={push.pressed}>
            <Encoder label={LIGHT_ENCODER_LABELS[cell.index]} cw={cw} ccw={ccw} push={push} />
          </PanelCard>
        )
      })}
    </div>
  )
}
