import { Section } from '~/components'
import styles from './Placeholder.module.css'

interface Props {
  title: string
}

export function Placeholder({ title }: Props) {
  return (
    <Section label={title}>
      <div className={styles.empty}>Coming soon</div>
    </Section>
  )
}
