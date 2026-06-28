import { ArrowLeftOutlined } from '@lineiconshq/free-icons'
import { useNavigate } from 'react-router'
import { Icon, Section } from '~/components'
import styles from './DeviceSettings.module.css'

interface Props {
  title: string
}

// Per-device settings view for products without bespoke settings yet (approach,
// panel). Mirrors the autopilot settings layout — back button + titled Section —
// with a placeholder body to fill in later.
export function DeviceSettings({ title }: Props) {
  const navigate = useNavigate()

  return (
    <>
      <button type="button" className={styles.back} onClick={() => navigate(-1)}>
        <Icon icon={ArrowLeftOutlined} size={24} />
        <span>Back</span>
      </button>
      <Section label={title}>
        <div className={styles.empty}>No settings yet</div>
      </Section>
    </>
  )
}
