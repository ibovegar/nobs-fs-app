import type { CSSProperties } from 'react'
import styles from './Lever.module.css'

interface Props {
  label: string
  /** number of detents along the slot (2+) */
  stages: number
  /** current detent index — 0 = topmost */
  value: number
  /** whether the lever is off its rest position (drives the glow) */
  active: boolean
  /** short status text shown beneath the lever */
  readout: string
  /** handle silhouette — flaps is a flat wide paddle, gear a long grip */
  shape?: 'wide' | 'long'
}

export function Lever({ label, stages, value, active, readout, shape = 'wide' }: Props) {
  // 0 = top of slot, 1 = bottom; the CSS maps it onto the handle's travel range.
  const fracOf = (i: number) => (stages > 1 ? i / (stages - 1) : 0)

  return (
    <>
      <span className={styles.label}>{label}</span>

      <div className={styles.quadrant}>
        <span className={styles.slot} />
        {Array.from({ length: stages }, (_, i) => fracOf(i)).map((frac) => (
          <span key={frac} className={styles.detent} style={{ '--frac': frac } as CSSProperties} />
        ))}
        <span
          className={`${styles.handle} ${styles[shape]}${active ? ` ${styles.on}` : ''}`}
          style={{ '--frac': fracOf(value) } as CSSProperties}
        />
      </div>

      <span className={`${styles.state}${active ? ` ${styles.stateOn}` : ''}`}>{readout}</span>
    </>
  )
}
