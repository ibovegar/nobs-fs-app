import { XmarkOutlined } from '@lineiconshq/free-icons'
import { useEffect } from 'react'
import { Icon } from '../Icon'
import styles from './ImageLightbox.module.css'

interface Props {
  src: string
  alt: string
  onClose: () => void
}

// Fullscreen overlay that shows an image at large size. Dismisses via the close
// button, a click on the backdrop, or the Escape key.
export function ImageLightbox({ src, alt, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label={alt}>
      {/* Full-cover dismiss button sits behind the image, so clicking the
          backdrop closes while clicking the image (above it) does not. */}
      <button
        type="button"
        className={styles.dismiss}
        onClick={onClose}
        aria-label="Close enlarged image"
      />
      <img src={src} alt={alt} className={styles.image} />
      <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
        <Icon icon={XmarkOutlined} size={24} />
      </button>
    </div>
  )
}
