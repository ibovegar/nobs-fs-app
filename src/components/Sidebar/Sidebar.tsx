import {
  ClipboardOutlined,
  Gear1Outlined,
  Home2Outlined,
  KeyboardOutlined,
} from '@lineiconshq/free-icons'
import { useState } from 'react'
import { Icon } from '../Icon'
import styles from './Sidebar.module.css'

const ITEMS = [
  { id: 'home', label: 'Home', icon: Home2Outlined },
  { id: 'devices', label: 'Devices', icon: KeyboardOutlined },
  { id: 'events', label: 'Event log', icon: ClipboardOutlined },
  { id: 'settings', label: 'Settings', icon: Gear1Outlined },
] as const

export function Sidebar() {
  const [active, setActive] = useState<(typeof ITEMS)[number]['id']>('home')

  return (
    <nav className={styles.sidebar}>
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`${styles.item}${active === item.id ? ` ${styles.itemActive}` : ''}`}
          aria-current={active === item.id ? 'page' : undefined}
          onClick={() => setActive(item.id)}
        >
          <Icon icon={item.icon} size={22} />
          <span className={styles.label}>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
