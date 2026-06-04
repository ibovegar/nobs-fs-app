import { ConnectionIndicator } from '../ConnectionIndicator'
import styles from './ProductImage.module.css'

interface Props {
  name: string
  image: string
}

// TODO: Use typography here! and change the CSS names

export function ProductImage({ name, image }: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>{name}</div>
        <ConnectionIndicator isConnected />
      </div>
      <div className={styles.imageContainer}>
        <img src={image} alt={name} className={styles.image} />
      </div>
    </div>
  )
}
