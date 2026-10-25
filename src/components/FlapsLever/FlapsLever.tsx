import type { CSSProperties } from 'react'
import styles from './FlapsLever.module.css'

interface Props {
  label: string
  /** where the lever is being held — it is momentary, so it rests at 'center' */
  tilt: 'up' | 'center' | 'down'
  /** number of flap settings the lever steps through */
  stages: number
  /** current flap setting — 0 = fully up */
  value: number
  /** highlight the status readout when off the rest setting */
  active: boolean
  /** short status text shown beneath the lever */
  readout: string
}

export function FlapsLever({ label, tilt, stages, value, active, readout }: Props) {
  // The lever only shows the flick; the setting it steps through lives in the
  // app, so it's read off the tick scale beside the lever instead.
  const pos = tilt === 'up' ? styles.up : tilt === 'down' ? styles.down : ''
  const fracOf = (i: number) => (stages > 1 ? i / (stages - 1) : 0)
  // the current setting glows; the ones passed on the way down fill in behind it
  const tickState = (i: number) => (i === value ? styles.tickOn : i < value ? styles.tickPast : '')

  return (
    <>
      <span className={styles.label}>{label}</span>

      <div className={`${styles.mount} ${pos}`}>
        <span className={styles.collar} />
        <span className={styles.base} />
        <span className={styles.flank} />
        <span className={styles.blade} />
        {Array.from({ length: stages }, (_, i) => fracOf(i)).map((frac, i) => (
          <span
            key={frac}
            className={`${styles.tick} ${tickState(i)}`}
            style={{ '--frac': frac } as CSSProperties}
          />
        ))}
      </div>

      <span className={`${styles.state}${active ? ` ${styles.stateOn}` : ''}`}>{readout}</span>
    </>
  )
}
