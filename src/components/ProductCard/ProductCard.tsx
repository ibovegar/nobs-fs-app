import type { ReactNode } from 'react'
import styles from './ProductCard.module.css'

interface Props {
  children: ReactNode
}

export function ProductCard({ children }: Props) {
  return <div className={styles.card}>{children}</div>
}
