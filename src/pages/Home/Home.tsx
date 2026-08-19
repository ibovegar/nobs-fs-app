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
  Windy,
} from '~/components'
import { type EventLogState, useInstances, type WindyControl } from '~/hooks'
import { isNative } from '~/io'
import { type DeviceKind, deviceFor, instancesFor, WINDY_NAME } from '~/panel'
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
  windy: WindyControl
}

// The primary (lowest) instance of each product is rendered from the watcher App
// owns (the shared, single owner). Every other tracked module is an opt-in extra,
// each a self-contained DeviceCard.
function Extras({
  kind,
  instances,
  className,
}: {
  kind: DeviceKind
  instances: number[]
  className: string
}) {
  const primary = instances[0]
  return (
    <>
      {instancesFor(kind, instances)
        .filter((device) => device.instance !== primary)
        .map((device) => (
          <Section key={device.key} className={className}>
            <DeviceCard device={device} image={IMAGES[kind]} />
          </Section>
        ))}
    </>
  )
}

export function Home({ autopilot, approach, panel, windy }: Props) {
  const instances = useInstances()
  // Name of each product's primary card — the lowest tracked instance, which may not
  // be instance 1 once a user removes it (e.g. only a left-mount "Nobs Panel 2" left).
  const primaryName = (kind: DeviceKind) =>
    deviceFor(kind, instances[kind][0], instances[kind].length).name

  const showWindy = isNative() ? windy.isConnected : windy.supported

  // Every tracked instance of a product is one section (its primary card plus one
  // Extras card per further unit), and Windy adds one more when visible.
  const sectionCount =
    instances.autopilot.length +
    instances.approach.length +
    instances.panel.length +
    (showWindy ? 1 : 0)

  // Up to three modules the sections share the viewport height and scale with the
  // window. Beyond that — which is exactly what adding Windy to a full set does —
  // sharing squeezes every card toward its minimum at once and they all become
  // unreadable. Past three, each section takes a fixed height instead and the body
  // (already overflow-y: auto) scrolls.
  const sectionClass =
    sectionCount > 3 ? `${styles.section} ${styles.sectionFixed}` : styles.section

  // A product shows its primary card only while it has a present instance. On the
  // web that's always true (the set keeps at least one); natively a product with
  // nothing plugged in has an empty set and is hidden entirely.
  return (
    <>
      {instances.autopilot.length > 0 && (
        <Section className={sectionClass}>
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
      <Extras kind="autopilot" instances={instances.autopilot} className={sectionClass} />

      {instances.approach.length > 0 && (
        <Section className={sectionClass}>
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
      <Extras kind="approach" instances={instances.approach} className={sectionClass} />

      {instances.panel.length > 0 && (
        <Section className={sectionClass}>
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
      <Extras kind="panel" instances={instances.panel} className={sectionClass} />

      {/*
       * Windy has no instance set behind it: it isn't on the HID bus, so there is
       * nothing to enumerate or to add by hand. Natively the card follows the
       * serial link — plugged in and it appears, same as the HID products. On the
       * web it stays visible so the Devices page can offer the port grant that
       * brings the link up in the first place.
       */}
      {showWindy && (
        <Section className={sectionClass}>
          <ProductCard>
            <ProductImage
              name={windy.identity?.name || WINDY_NAME}
              isConnected={windy.isConnected}
              settingsTo="/windy/settings"
            />
            <Windy
              state={windy.state}
              isConnected={windy.isConnected}
              needsGrant={windy.needsGrant}
              error={windy.error}
              onPower={windy.setPower}
              onSpeed={windy.setSpeed}
            />
          </ProductCard>
        </Section>
      )}
    </>
  )
}
