import styles from './SwitchBtn.module.css'

interface Props {
  index: number
  pressed: boolean
}

export function SwitchBtn({ index, pressed }: Props) {
  return (
    <>
      <span className={styles.label}>SW {index + 1}</span>
      <span className={`${styles.indicator}${pressed ? ` ${styles.indicatorOn}` : ''}`} />
      <span className={`${styles.state}${pressed ? ` ${styles.stateOn}` : ''}`}>
        {pressed ? 'ON' : 'OFF'}
      </span>
    </>
  )
}
