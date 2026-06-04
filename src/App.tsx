import approachImg from '~/assets/images/nobs_approach.svg'
import autopilotImg from '~/assets/images/nobs_autopilot.png'
import panelImg from '~/assets/images/nobs_panel.svg'
import {
  Approach,
  EventLog,
  Header,
  Panel,
  PanelGrid,
  ProductCard,
  ProductImage,
  Section,
} from '~/components'
import { useEventLog, useGamepad } from '~/hooks'
import { DEVICES } from '~/panel'
import styles from './App.module.css'

export default function App() {
  const autopilot = useEventLog()
  const approach = useGamepad(DEVICES.approach)
  const panel = useGamepad(DEVICES.panel)

  return (
    <div className={styles.panel}>
      <Header />
      <main className={styles.body}>
        <Section>
          <ProductCard>
            <ProductImage
              name={DEVICES.autopilot.name}
              image={autopilotImg}
              isConnected={autopilot.isConnected}
            />
            <PanelGrid buttons={autopilot.buttons} />
          </ProductCard>
        </Section>
        <Section>
          <ProductCard>
            <ProductImage
              name={DEVICES.approach.name}
              image={approachImg}
              isConnected={approach.isConnected}
            />
            <Approach buttons={approach.buttons} />
          </ProductCard>
        </Section>
        <Section>
          <ProductCard>
            <ProductImage
              name={DEVICES.panel.name}
              image={panelImg}
              isConnected={panel.isConnected}
            />
            <Panel buttons={panel.buttons} />
          </ProductCard>
        </Section>
        <Section label="EVENT LOG">
          <EventLog log={autopilot.log} isConnected={autopilot.isConnected} />
        </Section>
      </main>
    </div>
  )
}
