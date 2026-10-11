import type { YokeCap } from '~/panel'
import styles from './CapButton.module.css'

interface Props {
  label: string
  cap: YokeCap
  pressed: boolean
}

const CAP_CLASS: Record<YokeCap, string> = {
  red: styles.red,
  'red-small': `${styles.red} ${styles.small}`,
  black: styles.black,
}

export function CapButton({ label, cap, pressed }: Props) {
  return (
    <>
      <span className={styles.label}>{label}</span>

      <div className={styles.well}>
        <span className={`${styles.cap} ${CAP_CLASS[cap]}${pressed ? ` ${styles.pressed}` : ''}`} />
      </div>

      <span className={`${styles.state}${pressed ? ` ${styles.stateOn}` : ''}`}>
        {pressed ? 'ON' : 'OFF'}
      </span>
    </>
  )
}
