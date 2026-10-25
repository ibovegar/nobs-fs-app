import styles from './SwitchBtn.module.css'

interface Props {
  index: number
  pressed: boolean
}

export function SwitchBtn({ index, pressed }: Props) {
  return (
    <>
      <span className={styles.label}>SW {index + 1}</span>

      <div className={styles.well}>
        <span className={`${styles.cap}${pressed ? ` ${styles.pressed}` : ''}`} />
      </div>

      <span className={`${styles.state}${pressed ? ` ${styles.stateOn}` : ''}`}>
        {pressed ? 'ON' : 'OFF'}
      </span>
    </>
  )
}
