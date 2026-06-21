import approachImg from '~/assets/images/nobs_approach.png'
import autopilotImg from '~/assets/images/nobs_autopilot.png'
import panelImg from '~/assets/images/nobs_panel.png'
import {
  Approach,
  DeviceCard,
  Panel,
  PanelGrid,
  ProductCard,
  ProductImage,
  Section,
} from '~/components'
import { type DeviceState, type EventLogState, useInstanceCounts } from '~/hooks'
import { DEVICES, type DeviceKind, instancesOf } from '~/panel'
import styles from './Home.module.css'

const IMAGES: Record<DeviceKind, string> = {
  autopilot: autopilotImg,
  approach: approachImg,
  panel: panelImg,
}

interface Props {
  autopilot: EventLogState
  approach: DeviceState
  panel: EventLogState
}

// Instance 1 of each product is rendered from the watcher App owns (the shared,
// single owner). Modules 2+ are opt-in extras, each a self-contained DeviceCard.
function Extras({ kind, count }: { kind: DeviceKind; count: number }) {
  return (
    <>
      {instancesOf(kind, count)
        .slice(1)
        .map((device) => (
          <Section key={device.key} className={styles.section}>
            <DeviceCard device={device} image={IMAGES[kind]} />
          </Section>
        ))}
    </>
  )
}

export function Home({ autopilot, approach, panel }: Props) {
  const counts = useInstanceCounts()

  return (
    <>
      <Section className={styles.section}>
        <ProductCard>
          <ProductImage
            name={DEVICES.autopilot.name}
            image={autopilotImg}
            isConnected={autopilot.isConnected}
            settingsTo="/autopilot/settings"
          />
          <PanelGrid buttons={autopilot.buttons} />
        </ProductCard>
      </Section>
      <Extras kind="autopilot" count={counts.autopilot} />

      <Section className={styles.section}>
        <ProductCard>
          <ProductImage
            name={DEVICES.approach.name}
            image={approachImg}
            isConnected={approach.isConnected}
          />
          <Approach buttons={approach.buttons} />
        </ProductCard>
      </Section>
      <Extras kind="approach" count={counts.approach} />

      <Section className={styles.section}>
        <ProductCard>
          <ProductImage
            name={DEVICES.panel.name}
            image={panelImg}
            isConnected={panel.isConnected}
          />
          <Panel buttons={panel.buttons} />
        </ProductCard>
      </Section>
      <Extras kind="panel" count={counts.panel} />
    </>
  )
}
