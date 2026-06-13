import type { ButtonState } from '~/panel'
import { PanelCard } from '../PanelCard'
import { ToggleSwitch } from '../ToggleSwitch'
import styles from './Panel.module.css'

// Nobs Panel: 8 toggle switches in two rows of four. The rightmost switch in each
// row is a 3-position (ON-OFF-ON) toggle reported as an up/down button pair; the
// other six are 2-position (ON-ON) toggles, each reported as a single button.
type Cell =
  | { id: string; label: string; kind: 'on-on'; btn: number }
  | { id: string; label: string; kind: 'on-off-on'; up: number; down: number }

const ROWS: Cell[][] = [
  [
    { id: 'sw1', label: 'SW1', kind: 'on-on', btn: 0 },
    { id: 'sw2', label: 'SW2', kind: 'on-on', btn: 1 },
    { id: 'sw3', label: 'SW3', kind: 'on-on', btn: 2 },
    { id: 'sw4', label: 'SW4', kind: 'on-off-on', up: 3, down: 4 },
  ],
  [
    { id: 'sw5', label: 'SW5', kind: 'on-on', btn: 5 },
    { id: 'sw6', label: 'SW6', kind: 'on-on', btn: 6 },
    { id: 'sw7', label: 'SW7', kind: 'on-on', btn: 7 },
    { id: 'sw8', label: 'SW8', kind: 'on-off-on', up: 8, down: 9 },
  ],
]

interface Props {
  buttons: ButtonState[]
}

export function Panel({ buttons }: Props) {
  return (
    <div className={styles.grid}>
      {ROWS.flat().map((cell) => {
        if (cell.kind === 'on-on') {
          const pressed = buttons[cell.btn].pressed
          return (
            <PanelCard key={cell.id} active={pressed}>
              <ToggleSwitch
                label={cell.label}
                position={pressed ? 'down' : 'up'}
                active={pressed}
                readout={pressed ? 'DOWN' : 'UP'}
              />
            </PanelCard>
          )
        }
        const up = buttons[cell.up].pressed
        const down = buttons[cell.down].pressed
        return (
          <PanelCard key={cell.id} active={up || down}>
            <ToggleSwitch
              label={cell.label}
              position={up ? 'up' : down ? 'down' : 'center'}
              active={up || down}
              readout={up ? 'UP' : down ? 'DOWN' : 'CENTER'}
            />
          </PanelCard>
        )
      })}
    </div>
  )
}
