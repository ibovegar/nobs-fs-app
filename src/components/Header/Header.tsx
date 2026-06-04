import styles from './Header.module.css'

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.title}>
        <span className={styles.titleMain}>Nobs</span>
        <span className={styles.titleSub}>FS</span>
      </div>
    </header>
  )
}
