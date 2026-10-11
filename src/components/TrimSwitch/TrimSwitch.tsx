import styles from './TrimSwitch.module.css'

interface Props {
  label: string
  /** cap position — 'center' is the sprung rest of the momentary (ON)-OFF-(ON) switch */
  position: 'up' | 'center' | 'down'
}

export function TrimSwitch({ label, position }: Props) {
  const pos = position === 'up' ? styles.up : position === 'down' ? styles.down : ''
  const active = position !== 'center'

  return (
    <>
      <span className={styles.label}>{label}</span>

      <div className={styles.slot}>
        <span className={`${styles.cap} ${pos}`}>
          <span className={styles.line} />
          <span className={styles.line} />
          <span className={styles.line} />
        </span>
      </div>

      <span className={`${styles.state}${active ? ` ${styles.stateOn}` : ''}`}>
        {position.toUpperCase()}
      </span>
    </>
  )
}
