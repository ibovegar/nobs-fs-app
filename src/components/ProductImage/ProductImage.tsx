import { Gear1Outlined, Hammer1Outlined } from '@lineiconshq/free-icons'
import { NavLink } from 'react-router'
import { ConnectionIndicator } from '../ConnectionIndicator'
import { Icon } from '../Icon'
import styles from './ProductImage.module.css'

interface Props {
  name: string
  image: string
  isConnected: boolean
  // Per-device settings route. Omit for devices that have no settings page.
  settingsTo?: string
}

// TODO: Use typography here! and change the CSS names

export function ProductImage({ name, image, isConnected, settingsTo }: Props) {
  const links = [
    { to: '/tools', label: 'Tools', icon: Hammer1Outlined },
    ...(settingsTo ? [{ to: settingsTo, label: 'Settings', icon: Gear1Outlined }] : []),
  ]

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>{name}</div>
        <ConnectionIndicator isConnected={isConnected} />
      </div>
      <div className={styles.imageContainer}>
        <img src={image} alt={name} className={styles.image} />
      </div>
      <nav className={styles.nav}>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `${styles.navLink}${isActive ? ` ${styles.navLinkActive}` : ''}`
            }
          >
            <Icon icon={link.icon} size={18} />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
