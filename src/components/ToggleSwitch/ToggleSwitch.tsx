import type { ToggleCap } from '~/panel'
import styles from './ToggleSwitch.module.css'

interface Props {
  label: string
  /** bat position — 'center' only occurs on 3-position (ON-OFF-ON) switches */
  position: 'up' | 'center' | 'down'
  /** highlight the status readout when in an engaged position */
  active: boolean
  /** short status text shown beneath the switch */
  readout: string
  /** colour of the plastic cap on the bat; omit for a bare steel bat */
  cap?: ToggleCap
}

export function ToggleSwitch({ label, position, active, readout, cap }: Props) {
  // The handle looks the same regardless of state — like a real switch, you read
  // it by position. CENTER is the resting state (the bare .body/.tip rules); only
  // up/down add a modifier, set on the bat so its body and tip move together.
  // State colour lives on the readout text, not the handle; the cap colour is the
  // physical part's, not a state.
  const pos = position === 'up' ? styles.up : position === 'down' ? styles.down : ''
  const capped = cap ? ` ${styles.capped} ${styles[cap]}` : ''

  return (
    <>
      <span className={styles.label}>{label}</span>

      <div className={styles.switch}>
        <span className={styles.collar} />
        <span className={`${styles.bat} ${pos}${capped}`}>
          <span className={styles.body}>{cap && <span className={styles.sleeve} />}</span>
          <span className={styles.tip} />
        </span>
      </div>

      <span className={`${styles.state}${active ? ` ${styles.stateOn}` : ''}`}>{readout}</span>
    </>
  )
}
