import { type ReactNode, useEffect, useRef, useState } from 'react'
import styles from './PanelCard.module.css'

interface Props {
  active?: boolean
  /** Pass a value that changes (e.g. a press timestamp) to trigger a one-shot background flash. */
  flashKey?: number
  children: ReactNode
}

export function PanelCard({ active = false, flashKey, children }: Props) {
  // Each flashKey change bumps flashId, which is the React key of the flash
  // overlay. Remounting the overlay restarts its CSS animation from the start,
  // so rapid back-to-back actuations each get their own flash — a boolean class
  // can't retrigger an animation that's already running, which dropped flashes
  // when a control (e.g. the flaps lever) was moved fast.
  const [flashId, setFlashId] = useState(0)
  const prevFlashKey = useRef(flashKey)

  useEffect(() => {
    if (flashKey !== undefined && flashKey !== prevFlashKey.current) {
      prevFlashKey.current = flashKey
      setFlashId((n) => n + 1)
    }
  }, [flashKey])

  return (
    <div className={`${styles.card}${active ? ` ${styles.active}` : ''}`}>
      {flashId > 0 && <span key={flashId} className={styles.flash} aria-hidden="true" />}
      {children}
    </div>
  )
}
