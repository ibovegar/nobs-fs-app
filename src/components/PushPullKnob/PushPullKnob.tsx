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

      <div className={`${styles.mount} ${pos}`}>
        <span className={styles.bezel} />
        <span className={styles.knob} />
      </div>

      <span className={`${styles.state}${on ? ` ${styles.stateOn}` : ''}`}>{state}</span>
    </>
  )
}
