import autopilotImg from '~/assets/images/nobs_autopilot.png'
import { Approach, Panel, PanelGrid, ProductCard, ProductImage, Section } from '~/components'
import type { DeviceState, EventLogState } from '~/hooks'
import { DEVICES } from '~/panel'
import styles from './Home.module.css'

interface Props {
  autopilot: EventLogState
  approach: DeviceState
  panel: DeviceState
}

export function Home({ autopilot, approach, panel }: Props) {
  return (
    <>
      <Section className={styles.section}>
        <ProductCard>
          <ProductImage
            name={DEVICES.autopilot.name}
            image={autopilotImg}
            isConnected={autopilot.isConnected}
          />
          <PanelGrid buttons={autopilot.buttons} />
        </ProductCard>
      </Section>
      <Section className={styles.section}>
        <ProductCard>
          <ProductImage
            name={DEVICES.approach.name}
            image={autopilotImg}
            isConnected={approach.isConnected}
          />
          <Approach buttons={approach.buttons} />
        </ProductCard>
      </Section>
      <Section className={styles.section}>
        <ProductCard>
          <ProductImage
            name={DEVICES.panel.name}
            image={autopilotImg}
            isConnected={panel.isConnected}
          />
          <Panel buttons={panel.buttons} />
        </ProductCard>
      </Section>
    </>
  )
}
