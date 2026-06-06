import logo from '~/assets/images/logo_2.svg'
import styles from './Header.module.css'

export function Header() {
  return (
    <header className={styles.header}>
      <img className={styles.logo} src={logo} alt="Nobs FS" />
    </header>
  )
}
