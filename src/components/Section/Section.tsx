import type { ReactNode } from 'react'
import styles from './Section.module.css'

interface Props {
  label?: string
  className?: string
  children: ReactNode
}

export function Section({ label, className, children }: Props) {
  return (
    <section className={`${styles.section}${className ? ` ${className}` : ''}`}>
      {label && <div className={styles.label}>{label}</div>}
      {children}
    </section>
  )
}
