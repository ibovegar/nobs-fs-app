import styles from './SwitchBtn.module.css'

interface Props {
  index: number
  pressed: boolean
}

export function SwitchBtn({ index, pressed }: Props) {
  return (
    <>
      <span className={styles.label}>SW {index + 1}</span>

      <button
        type="button"
        tabIndex={-1}
        className={`${styles.button}${pressed ? ` ${styles.buttonOn}` : ''}`}
      >
        <span className={styles.led} />
        <span className={styles.cap}>{pressed ? 'ON' : 'OFF'}</span>
      </button>
    </>
  )
}
