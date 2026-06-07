import type { CSSProperties } from 'react'
import type { ButtonState } from '~/panel'
import styles from './Encoder.module.css'

interface Props {
  label: string
  cw: ButtonState
  ccw: ButtonState
  push: ButtonState
}

/** Degrees the knob rotates per detent pulse. */
const STEP_DEG = 30

export function Encoder({ label, cw, ccw, push }: Props) {
  const net = cw.count - ccw.count
  const angle = net * STEP_DEG

  const turning = cw.pressed || ccw.pressed
  const dirClass = cw.pressed ? styles.knobCw : ccw.pressed ? styles.knobCcw : ''

  return (
    <>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={`${styles.push}${push.pressed ? ` ${styles.pushOn}` : ''}`} />
      </div>

      <div className={styles.body}>
        <div
          className={`${styles.knob}${turning ? ` ${styles.knobLive}` : ''} ${dirClass}`}
          style={{ '--knob-angle': `${angle}deg` } as CSSProperties}
        >
          <span className={styles.indicator} />
        </div>
      </div>
    </>
  )
}
