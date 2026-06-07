import { ArrowLeftOutlined } from '@lineiconshq/free-icons'
import { useNavigate } from 'react-router'
import { Icon, Section } from '~/components'
import { type ButtonState, ENCODER_LABELS } from '~/panel'
import { HsiTool } from './HsiTool'
import styles from './Tools.module.css'

interface Props {
  buttons: ButtonState[]
}

export function Tools({ buttons }: Props) {
  const navigate = useNavigate()

  return (
    <>
      <button type="button" className={styles.back} onClick={() => navigate(-1)}>
        <Icon icon={ArrowLeftOutlined} size={24} />
        <span>Back</span>
      </button>
      <div className={styles.grid}>
        {ENCODER_LABELS.map((label, i) => (
          <Section key={label} label={label} className={styles.card}>
            <HsiTool encoder={i} buttons={buttons} />
          </Section>
        ))}
      </div>
    </>
  )
}
