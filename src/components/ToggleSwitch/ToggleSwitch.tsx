import styles from './ToggleSwitch.module.css'

interface Props {
  label: string
  /** bat position — 'center' only occurs on 3-position (ON-OFF-ON) switches */
  position: 'up' | 'center' | 'down'
  /** highlight the status readout when in an engaged position */
  active: boolean
  /** short status text shown beneath the switch */
  readout: string
}

export function ToggleSwitch({ label, position, active, readout }: Props) {
  // The handle is a solid metal bat regardless of state — like a real switch, you
  // read it by position. CENTER is the resting state (the bare .shaft/.knob rules);
  // only up/down add a modifier, and both shaft and knob take it so they animate
  // together. State colour lives on the readout text, not the handle.
  const pos = position === 'up' ? styles.up : position === 'down' ? styles.down : ''

  return (
    <>
      <span className={styles.label}>{label}</span>

      <div className={styles.switch}>
        <span className={styles.nut} />
        <span className={`${styles.shaft} ${pos}`} />
        <span className={`${styles.knob} ${pos}`} />
      </div>

      <span className={`${styles.state}${active ? ` ${styles.stateOn}` : ''}`}>{readout}</span>
    </>
  )
}
