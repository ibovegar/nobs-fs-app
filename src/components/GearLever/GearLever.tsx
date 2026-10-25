import styles from './GearLever.module.css'

interface Props {
  label: string
  /** lever position — the gear switch is maintained, so always up or down */
  position: 'up' | 'down'
  /** highlight the status readout when in the engaged position */
  active: boolean
  /** short status text shown beneath the lever */
  readout: string
}

export function GearLever({ label, position, active, readout }: Props) {
  // Like the toggles, the handle looks the same in either state: you read it by
  // position. State colour lives on the readout only.
  return (
    <>
      <span className={styles.label}>{label}</span>

      <div className={`${styles.mount} ${position === 'up' ? styles.up : styles.down}`}>
        <span className={styles.collar} />
        <span className={styles.stem} />
        <span className={styles.rim} />
        <span className={styles.wheel} />
      </div>

      <span className={`${styles.state}${active ? ` ${styles.stateOn}` : ''}`}>{readout}</span>
    </>
  )
}
