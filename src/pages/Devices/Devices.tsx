import { useCallback, useEffect, useState } from 'react'
import { ConnectionIndicator, Section } from '~/components'
import { grantedFlags, onHidChange, requestHidDevices, webhidSupported } from '~/io'
import { DEVICES, type DeviceConfig } from '~/panel'
import styles from './Devices.module.css'

type DeviceKey = keyof typeof DEVICES

const DEVICE_KEYS = Object.keys(DEVICES) as DeviceKey[]
const NONE = Object.fromEntries(DEVICE_KEYS.map((k) => [k, false])) as Record<DeviceKey, boolean>

interface Props {
  connected: Record<DeviceKey, boolean>
}

export function Devices({ connected }: Props) {
  const supported = webhidSupported()
  const [granted, setGranted] = useState<Record<DeviceKey, boolean>>(NONE)

  const refresh = useCallback(async () => {
    const flags = await grantedFlags(DEVICE_KEYS.map((k) => DEVICES[k]))
    setGranted(
      Object.fromEntries(DEVICE_KEYS.map((k, i) => [k, flags[i]])) as Record<DeviceKey, boolean>,
    )
  }, [])

  useEffect(() => {
    if (!supported) return
    refresh()
    return onHidChange(refresh)
  }, [supported, refresh])

  const connect = async (device: DeviceConfig) => {
    await requestHidDevices([device])
    refresh()
  }

  return (
    <Section label="Devices">
      <div className={styles.body}>
        <p className={styles.hint}>
          {supported
            ? "Grant one-time access to a device; it's then detected automatically whenever it's plugged in."
            : 'Automatic detection needs a Chromium browser (Chrome or Edge). Otherwise a device is detected once you actuate one of its controls.'}
        </p>
        <ul className={styles.list}>
          {DEVICE_KEYS.map((key) => {
            const device = DEVICES[key]
            return (
              <li key={key} className={styles.row}>
                <div className={styles.info}>
                  <span className={styles.name}>{device.name}</span>
                  <span className={styles.id}>
                    {device.vid}:{device.pid}
                  </span>
                </div>
                <ConnectionIndicator isConnected={connected[key]} />
                {supported &&
                  (granted[key] ? (
                    <span className={styles.granted}>Access granted</span>
                  ) : (
                    <button
                      type="button"
                      className={styles.connect}
                      onClick={() => void connect(device)}
                    >
                      Connect
                    </button>
                  ))}
              </li>
            )
          })}
        </ul>
      </div>
    </Section>
  )
}
