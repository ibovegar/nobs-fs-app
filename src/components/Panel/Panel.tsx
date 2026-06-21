import { type ButtonState, PANEL_SWITCH_ROWS, PANEL_SWITCHES } from '~/panel'
import { PanelCard } from '../PanelCard'
import { ToggleSwitch } from '../ToggleSwitch'
import styles from './Panel.module.css'

// Switch indices in physical front-panel order (4 columns × 2 rows, wrapped by
// CSS). The switch table and its wiring live in ~/panel (PANEL_SWITCHES).
const CELLS = PANEL_SWITCH_ROWS.flat()

interface Props {
  buttons: ButtonState[]
}

export function Panel({ buttons }: Props) {
  return (
    <div className={styles.grid}>
      {CELLS.map((i) => {
        const sw = PANEL_SWITCHES[i]
        const up = buttons[sw.up].pressed
        const down = buttons[sw.down].pressed
        const active = up || down
        // ON-ON always has one terminal closed, so it never rests in the center;
        // default it to 'up' when neither reads (e.g. before the first report).
        let position: 'up' | 'down' | 'center' = 'up'
        if (down) position = 'down'
        else if (!up && sw.kind === 'on-off-on') position = 'center'
        // Flash the card background on actuation rather than holding it lit — for
        // ON-ON switches one terminal is always closed, so a persistent highlight
        // would mean every card stays lit all the time.
        const flashKey = Math.max(buttons[sw.up].lastPress, buttons[sw.down].lastPress)
        return (
          <PanelCard key={sw.label} flashKey={flashKey}>
            <ToggleSwitch
              label={sw.label}
              position={position}
              active={active}
              readout={position.toUpperCase()}
            />
          </PanelCard>
        )
      })}
    </div>
  )
}
