import styles from './Header.module.css'

interface Props {
  isConnected: boolean
}

export function Header({ isConnected }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.title}>
        <span className={styles.titleMain}>Nobs</span>
        <span className={styles.titleSub}>FS</span>
        {/* <span className={styles.titleSub}>4 ENCODERS · 8 SWITCHES</span> */}
      </div>
      <div className={`${styles.badge} ${isConnected ? styles.badgeOn : styles.badgeOff}`}>
        <span className={styles.dot} />
        {isConnected ? 'CONNECTED' : 'AWAITING DEVICE'}
      </div>
    </header>
  )
}
