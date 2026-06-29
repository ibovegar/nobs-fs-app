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
import { type EventLogState, useInstances } from '~/hooks'
import { type DeviceKind, deviceFor, instancesFor } from '~/panel'
import styles from './Home.module.css'

const IMAGES: Record<DeviceKind, string> = {
  autopilot: autopilotImg,
  approach: approachImg,
  panel: panelImg,
}

interface Props {
  autopilot: EventLogState
  approach: EventLogState
  panel: EventLogState
}

// The primary (lowest) instance of each product is rendered from the watcher App
// owns (the shared, single owner). Every other tracked module is an opt-in extra,
// each a self-contained DeviceCard.
function Extras({ kind, instances }: { kind: DeviceKind; instances: number[] }) {
  const primary = instances[0]
  return (
    <>
      {instancesFor(kind, instances)
        .filter((device) => device.instance !== primary)
        .map((device) => (
          <Section key={device.key} className={styles.section}>
            <DeviceCard device={device} image={IMAGES[kind]} />
          </Section>
        ))}
    </>
  )
}

export function Home({ autopilot, approach, panel }: Props) {
  const instances = useInstances()
  // Name of each product's primary card — the lowest tracked instance, which may not
  // be instance 1 once a user removes it (e.g. only a left-mount "Nobs Panel 2" left).
  const primaryName = (kind: DeviceKind) =>
    deviceFor(kind, instances[kind][0], instances[kind].length).name

  // A product shows its primary card only while it has a present instance. On the
  // web that's always true (the set keeps at least one); natively a product with
  // nothing plugged in has an empty set and is hidden entirely.
  return (
    <>
      {instances.autopilot.length > 0 && (
        <Section className={styles.section}>
          <ProductCard>
            <ProductImage
              name={primaryName('autopilot')}
              image={autopilotImg}
              isConnected={autopilot.isConnected}
              toolsTo="/tools/autopilot"
              settingsTo="/autopilot/settings"
            />
            <PanelGrid buttons={autopilot.buttons} />
          </ProductCard>
        </Section>
      )}
      <Extras kind="autopilot" instances={instances.autopilot} />

      {instances.approach.length > 0 && (
        <Section className={styles.section}>
          <ProductCard>
            <ProductImage
              name={primaryName('approach')}
              image={approachImg}
              isConnected={approach.isConnected}
              toolsTo="/tools/approach"
              settingsTo="/approach/settings"
            />
            <Approach buttons={approach.buttons} />
          </ProductCard>
        </Section>
      )}
      <Extras kind="approach" instances={instances.approach} />

      {instances.panel.length > 0 && (
        <Section className={styles.section}>
          <ProductCard>
            <ProductImage
              name={primaryName('panel')}
              image={panelImg}
              isConnected={panel.isConnected}
              toolsTo="/tools/panel"
              settingsTo="/panel/settings"
            />
            <Panel buttons={panel.buttons} />
          </ProductCard>
        </Section>
      )}
      <Extras kind="panel" instances={instances.panel} />
    </>
  )
}
