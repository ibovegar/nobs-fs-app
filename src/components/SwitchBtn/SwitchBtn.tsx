import styles from './SwitchBtn.module.css'

interface Props {
  index: number
  pressed: boolean
  count: number
}

export function SwitchBtn({ index, pressed, count }: Props) {
  return (
    <>
      <span className={styles.label}>SW {index + 1}</span>
      <span className={`${styles.indicator}${pressed ? ` ${styles.indicatorOn}` : ''}`} />
      <span className={`${styles.state}${pressed ? ` ${styles.stateOn}` : ''}`}>
        {pressed ? 'ON' : 'OFF'}
      </span>
      {count > 0 && <span className={styles.count}>{count}×</span>}
    </>
  )
}
