import { type ReactNode, useEffect, useRef, useState } from 'react'
import styles from './PanelCard.module.css'

interface Props {
  active?: boolean
  /** Pass a value that changes (e.g. a press timestamp) to trigger a one-shot background flash. */
  flashKey?: number
  children: ReactNode
}

export function PanelCard({ active = false, flashKey, children }: Props) {
  const [flashing, setFlashing] = useState(false)
  const prevFlashKey = useRef(flashKey)

  useEffect(() => {
    if (flashKey !== undefined && flashKey !== prevFlashKey.current) {
      prevFlashKey.current = flashKey
      setFlashing(true)
    }
  }, [flashKey])

  return (
    <div
      className={`${styles.card}${active ? ` ${styles.active}` : ''}${flashing ? ` ${styles.flash}` : ''}`}
      onAnimationEnd={() => setFlashing(false)}
    >
      {children}
    </div>
  )
}
