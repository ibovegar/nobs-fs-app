import styles from './ToggleSwitch.module.css'

interface Props {
  label: string
  /** bat position — 'center' only occurs on 3-position (ON-OFF-ON) switches */
  position: 'up' | 'center' | 'down'
  /** glow when the switch is in an engaged position */
  active: boolean
  /** short status text shown beneath the switch */
  readout: string
}

export function ToggleSwitch({ label, position, active, readout }: Props) {
  const pos = position === 'up' ? styles.up : position === 'down' ? styles.down : styles.center

  return (
    <>
      <span className={styles.label}>{label}</span>

      <div className={styles.switch}>
        <span className={styles.nut} />
        <span className={`${styles.bat} ${pos}${active ? ` ${styles.on}` : ''}`} />
      </div>

      <span className={`${styles.state}${active ? ` ${styles.stateOn}` : ''}`}>{readout}</span>
    </>
  )
}
