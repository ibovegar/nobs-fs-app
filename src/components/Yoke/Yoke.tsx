import { type ButtonState, YOKE_CONTROLS } from '~/panel'
import { CapButton } from '../CapButton'
import { PanelCard } from '../PanelCard'
import { TrimSwitch } from '../TrimSwitch'
import styles from './Yoke.module.css'

interface Props {
  buttons: ButtonState[]
}

export function Yoke({ buttons }: Props) {
  return (
    <div className={styles.grid}>
      {YOKE_CONTROLS.map((control) => {
        if (control.kind === 'toggle') {
          const up = buttons[control.up].pressed
          const down = buttons[control.down].pressed
          // The trim switches are momentary (ON)-OFF-(ON): neither terminal closed
          // = sprung back to the centre.
          const position = up ? 'up' : down ? 'down' : 'center'
          return (
            <PanelCard key={control.label} active={up || down}>
              <TrimSwitch label={control.label} position={position} />
            </PanelCard>
          )
        }
        const { pressed } = buttons[control.button]
        return (
          <PanelCard key={control.label} active={pressed}>
            <CapButton label={control.label} cap={control.cap} pressed={pressed} />
          </PanelCard>
        )
      })}
      <div className={styles.filler} />
    </div>
  )
}
