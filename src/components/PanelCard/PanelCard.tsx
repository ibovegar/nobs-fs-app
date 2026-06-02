import type { ReactNode } from 'react'
import styles from './PanelCard.module.css'

interface Props {
  active?: boolean
  children: ReactNode
}

export function PanelCard({ active = false, children }: Props) {
  return (
    <div className={`${styles.card}${active ? ` ${styles.active}` : ''}`}>
      {children}
    </div>
  )
}
