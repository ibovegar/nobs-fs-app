import { ArrowLeftOutlined } from '@lineiconshq/free-icons'
import { useNavigate, useParams } from 'react-router'
import { Icon, PanelPhoto, Section } from '~/components'
import { type ButtonState, type DeviceKind, ENCODER_LABELS, productName } from '~/panel'
import { HsiTool } from './HsiTool'
import styles from './Tools.module.css'

interface Props {
  autopilotButtons: ButtonState[]
  panelButtons: ButtonState[]
}

// One tools view per device kind, selected by the :kind route param. Each
// device card links to its own /tools/<kind>.
export function Tools({ autopilotButtons, panelButtons }: Props) {
  const navigate = useNavigate()
  const { kind } = useParams<{ kind: DeviceKind }>()

  return (
    <>
      <button type="button" className={styles.back} onClick={() => navigate(-1)}>
        <Icon icon={ArrowLeftOutlined} size={24} />
        <span>Back</span>
      </button>

      {kind === 'autopilot' && (
        <div className={styles.grid}>
          {ENCODER_LABELS.map((label, i) => (
            <Section key={label} label={label} className={styles.card}>
              <HsiTool encoder={i} buttons={autopilotButtons} />
            </Section>
          ))}
        </div>
      )}

      {kind === 'panel' && (
        <Section label={productName('panel')} className={styles.photoCard}>
          <PanelPhoto buttons={panelButtons} />
        </Section>
      )}

      {kind === 'approach' && (
        <Section label={productName('approach')}>
          <div className={styles.empty}>No tools yet</div>
        </Section>
      )}
    </>
  )
}
