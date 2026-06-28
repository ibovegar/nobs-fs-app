import styles from './AuroraBackground.module.css'

// Decorative, non-interactive backdrop: a handful of large blurred colour blobs
// that slowly drift around and cycle hue, giving a soft moving "cloud" wash
// behind the app content.
export function AuroraBackground() {
  return (
    <div className={styles.aurora} aria-hidden="true">
      <span className={`${styles.blob} ${styles.blob1}`} />
      <span className={`${styles.blob} ${styles.blob2}`} />
      <span className={`${styles.blob} ${styles.blob3}`} />
      <span className={`${styles.blob} ${styles.blob4}`} />
    </div>
  )
}
