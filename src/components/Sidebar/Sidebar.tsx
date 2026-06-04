import {
  ClipboardOutlined,
  Gear1Outlined,
  Home2Outlined,
  KeyboardOutlined,
} from '@lineiconshq/free-icons'
import { NavLink } from 'react-router'
import { Icon } from '../Icon'
import styles from './Sidebar.module.css'

const ITEMS = [
  { to: '/', label: 'Home', icon: Home2Outlined },
  { to: '/devices', label: 'Devices', icon: KeyboardOutlined },
  { to: '/events', label: 'Event log', icon: ClipboardOutlined },
  { to: '/settings', label: 'Settings', icon: Gear1Outlined },
] as const

export function Sidebar() {
  return (
    <nav className={styles.sidebar}>
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => `${styles.item}${isActive ? ` ${styles.itemActive}` : ''}`}
        >
          <Icon icon={item.icon} size={24} />
          <span className={styles.label}>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
