import { useDevice } from '~/hooks'
import type { DeviceConfig } from '~/panel'
import { Approach } from '../Approach'
import { Light } from '../Light'
import { Panel } from '../Panel'
import { PanelGrid } from '../PanelGrid'
import { ProductCard } from '../ProductCard'
import { ProductImage } from '../ProductImage'
import { Yoke } from '../Yoke'

interface Props {
  device: DeviceConfig
  // Product photo; omit for a product with no photo yet.
  image?: string
}

// One self-contained device instance: watches its own HID stream and renders the
// body matching its product kind. Used for every Home card except each product's
// primary instance, which shares the event-log watcher App owns (see Home / App).
export function DeviceCard({ device, image }: Props) {
  const { isConnected, buttons } = useDevice(device)

  return (
    <ProductCard>
      <ProductImage
        name={device.name}
        image={image}
        isConnected={isConnected}
        toolsTo={`/tools/${device.kind}`}
        settingsTo={`/${device.kind}/settings`}
      />
      {device.kind === 'panel' && <Panel buttons={buttons} />}
      {device.kind === 'approach' && <Approach buttons={buttons} />}
      {device.kind === 'autopilot' && <PanelGrid buttons={buttons} />}
      {device.kind === 'light' && <Light buttons={buttons} />}
      {device.kind === 'yoke' && <Yoke buttons={buttons} />}
    </ProductCard>
  )
}
