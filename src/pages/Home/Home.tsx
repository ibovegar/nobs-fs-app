import approachImg from '~/assets/images/nobs_approach.svg'
import autopilotImg from '~/assets/images/nobs_autopilot.png'
import panelImg from '~/assets/images/nobs_panel.svg'
import { Approach, Panel, PanelGrid, ProductCard, ProductImage, Section } from '~/components'
import type { EventLogState, GamepadState } from '~/hooks'
import { DEVICES } from '~/panel'

interface Props {
  autopilot: EventLogState
  approach: GamepadState
  panel: GamepadState
}

export function Home({ autopilot, approach, panel }: Props) {
  return (
    <>
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
    </>
  )
}
