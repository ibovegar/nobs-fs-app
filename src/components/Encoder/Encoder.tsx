import type { ButtonState } from '~/panel'
import styles from './Encoder.module.css'

interface Props {
  label: string
  cw: ButtonState
  ccw: ButtonState
}

export function Encoder({ label, cw, ccw }: Props) {
  const net = cw.count - ccw.count

  return (
    <>
      <div className={styles.label}>{label}</div>

      <div className={styles.body}>
        <div
          key={`ccw-${ccw.lastPress}`}
          className={`${styles.arrow} ${styles.arrowCcw}${ccw.pressed ? ` ${styles.arrowLive}` : ''}${ccw.lastPress > 0 ? ` ${styles.arrowPulsed}` : ''}`}
        >
          ◀
        </div>

        <div className={styles.counts}>
          <span className={styles.countCcw}>{ccw.count}</span>
          <span className={styles.sep}>·</span>
          <span className={styles.countCw}>{cw.count}</span>
        </div>

        <div
          key={`cw-${cw.lastPress}`}
          className={`${styles.arrow} ${styles.arrowCw}${cw.pressed ? ` ${styles.arrowLive}` : ''}${cw.lastPress > 0 ? ` ${styles.arrowPulsed}` : ''}`}
        >
          ▶
        </div>
      </div>

      <div className={`${styles.net}${net !== 0 ? ` ${styles.netActive}` : ''}`}>
        {net > 0 ? `+${net}` : net === 0 ? '±0' : net}
      </div>
    </>
  )
}
