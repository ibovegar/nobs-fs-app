import type { ButtonState } from '~/panel'
import styles from './Encoder.module.css'

interface Props {
  label: string
  cw: ButtonState
  ccw: ButtonState
  push: ButtonState
}

export function Encoder({ label, cw, ccw, push }: Props) {
  return (
    <>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={`${styles.push}${push.pressed ? ` ${styles.pushOn}` : ''}`} />
      </div>

      <div className={styles.body}>
        <div
          key={`ccw-${ccw.lastPress}`}
          className={`${styles.arrow} ${styles.arrowCcw}${ccw.pressed ? ` ${styles.arrowLive}` : ''}${ccw.lastPress > 0 ? ` ${styles.arrowPulsed}` : ''}`}
        >
          ◀
        </div>

        <div
          key={`cw-${cw.lastPress}`}
          className={`${styles.arrow} ${styles.arrowCw}${cw.pressed ? ` ${styles.arrowLive}` : ''}${cw.lastPress > 0 ? ` ${styles.arrowPulsed}` : ''}`}
        >
          ▶
        </div>
      </div>
    </>
  )
}
