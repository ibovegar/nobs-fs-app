import type { ReactNode } from 'react'
import styles from './Section.module.css'

interface Props {
  label: string
  children: ReactNode
}

export function Section({ label, children }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.label}>{label}</div>
      {children}
    </section>
  )
}
