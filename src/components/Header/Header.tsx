import { XmarkOutlined } from '@lineiconshq/free-icons'
import logo from '~/assets/images/logo_2.svg'
import { isNative } from '~/io'
import { Icon } from '../Icon'
import styles from './Header.module.css'

// Close the native window (and, since it's the only window, the app). The
// import is dynamic so `@tauri-apps/api/window` never loads in the web build.
async function closeWindow() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  await getCurrentWindow().close()
}

export function Header() {
  // The header doubles as the drag handle for the frameless native window.
  return (
    <header className={styles.header} data-tauri-drag-region>
      <img className={styles.logo} src={logo} alt="Nobs FS" />
      {isNative() && (
        <button type="button" className={styles.close} onClick={closeWindow} aria-label="Close">
          <Icon icon={XmarkOutlined} size={18} />
        </button>
      )}
    </header>
  )
}
