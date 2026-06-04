import styles from './ConnectionIndicator.module.css'

interface Props {
  isConnected: boolean
}

export function ConnectionIndicator({ isConnected }: Props) {
  return (
    <div className={`${styles.badge} ${isConnected ? styles.badgeOn : styles.badgeOff}`}>
      <span className={styles.dot} />
      {isConnected ? 'CONNECTED' : 'AWAITING DEVICE'}
    </div>
  )
}
