import { Gear1Outlined, Hammer1Outlined, SearchPlusOutlined } from '@lineiconshq/free-icons'
import { useState } from 'react'
import { NavLink } from 'react-router'
import { ConnectionIndicator } from '../ConnectionIndicator'
import { Icon } from '../Icon'
import { ImageLightbox } from '../ImageLightbox'
import styles from './ProductImage.module.css'

interface Props {
  name: string
  image: string
  isConnected: boolean
  // Per-device tools route, e.g. "/tools/panel". Omit to hide the Tools link.
  toolsTo?: string
  // Per-device settings route. Omit for devices that have no settings page.
  settingsTo?: string
}

// TODO: Use typography here! and change the CSS names

export function ProductImage({ name, image, isConnected, toolsTo, settingsTo }: Props) {
  const [zoomed, setZoomed] = useState(false)

  const links = [
    ...(toolsTo ? [{ to: toolsTo, label: 'Tools', icon: Hammer1Outlined }] : []),
    ...(settingsTo ? [{ to: settingsTo, label: 'Settings', icon: Gear1Outlined }] : []),
  ]

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>{name}</div>
        <ConnectionIndicator isConnected={isConnected} />
      </div>
      <div className={styles.imageContainer}>
        <button
          type="button"
          className={styles.zoomButton}
          onClick={() => setZoomed(true)}
          aria-label={`Enlarge ${name} image`}
        >
          <img src={image} alt={name} className={styles.image} />
          <span className={styles.zoomOverlay} aria-hidden="true">
            <span className={styles.zoomChip}>
              <Icon icon={SearchPlusOutlined} size={28} />
            </span>
          </span>
        </button>
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

      {zoomed && <ImageLightbox src={image} alt={name} onClose={() => setZoomed(false)} />}
    </div>
  )
}
