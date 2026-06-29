import { type CSSProperties, useEffect, useRef, useState } from 'react'
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

// The raw cw/ccw "pressed" bit is only true for the instant a single detent
// contact is closed, so driving the halo off it directly flickers between
// pulses during a continuous turn (and can read as stuck if a release edge
// ever gets lost). Instead, light the halo on each pulse and hold it for this
// long; back-to-back pulses keep re-arming the hold, so a continuous turn
// reads as one steady glow that always fades out on its own shortly after the
// turning stops.
const LIVE_HOLD_MS = 220

export function Encoder({ label, cw, ccw, push }: Props) {
  const net = cw.count - ccw.count
  const angle = net * STEP_DEG

  const [liveDir, setLiveDir] = useState<'cw' | 'ccw' | null>(null)
  const lastSeen = useRef({ cw: cw.lastPress, ccw: ccw.lastPress })

  useEffect(() => {
    const cwChanged = cw.lastPress !== lastSeen.current.cw
    const ccwChanged = ccw.lastPress !== lastSeen.current.ccw
    if (!cwChanged && !ccwChanged) return
    lastSeen.current = { cw: cw.lastPress, ccw: ccw.lastPress }
    setLiveDir(cwChanged ? 'cw' : 'ccw')
    const timer = setTimeout(() => setLiveDir(null), LIVE_HOLD_MS)
    return () => clearTimeout(timer)
  }, [cw.lastPress, ccw.lastPress])

  const dirClass = liveDir === 'cw' ? styles.knobCw : liveDir === 'ccw' ? styles.knobCcw : ''

  return (
    <>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={`${styles.push}${push.pressed ? ` ${styles.pushOn}` : ''}`} />
      </div>

      <div className={styles.body}>
        <div
          className={`${styles.knob}${liveDir ? ` ${styles.knobLive}` : ''} ${dirClass}`}
          style={{ '--knob-angle': `${angle}deg` } as CSSProperties}
        >
          <span className={styles.indicator} />
        </div>
      </div>
    </>
  )
}
