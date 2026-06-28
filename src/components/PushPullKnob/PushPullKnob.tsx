import styles from './PushPullKnob.module.css'

interface Props {
  label: string
  /** knob pulled out */
  pulled: boolean
  /** knob pushed in */
  pushed: boolean
}

export function PushPullKnob({ label, pulled, pushed }: Props) {
  const pos = pulled ? styles.pull : pushed ? styles.push : ''
  // Pulled out = brake set (ON); pushed in or neutral = released (OFF).
  const on = pulled
  const state = on ? 'ON' : 'OFF'

  return (
    <>
      <span className={styles.label}>{label}</span>

      <div className={styles.mount}>
        <span className={styles.boss} />
        <span className={`${styles.plunger} ${pos}`}>
          <span className={`${styles.knob}${on ? ` ${styles.on}` : ''}`} />
          <span className={styles.shaft} />
        </span>
      </div>

      <span className={`${styles.state}${on ? ` ${styles.stateOn}` : ''}`}>{state}</span>
    </>
  )
}
