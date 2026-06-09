import { CheckSolid } from '@lineiconshq/free-icons'
import { useCallback, useEffect, useState } from 'react'
import { ConnectionIndicator, Icon, Section } from '~/components'
import { grantedFlags, isNative, onHidChange, requestHidDevices, webhidSupported } from '~/io'
import { DEVICES, type DeviceConfig } from '~/panel'
import styles from './Devices.module.css'

type DeviceKey = keyof typeof DEVICES

const DEVICE_KEYS = Object.keys(DEVICES) as DeviceKey[]
const NONE = Object.fromEntries(DEVICE_KEYS.map((k) => [k, false])) as Record<DeviceKey, boolean>

interface Props {
  connected: Record<DeviceKey, boolean>
}

export function Devices({ connected }: Props) {
  // The native shell uses the Tauri HID bridge, which enumerates devices itself
  // — no per-device permission grant. WebHID's one-time grant is web-only.
  const needsGrant = !isNative() && webhidSupported()
  const [granted, setGranted] = useState<Record<DeviceKey, boolean>>(NONE)

  const refresh = useCallback(async () => {
    const flags = await grantedFlags(DEVICE_KEYS.map((k) => DEVICES[k]))
    setGranted(
      Object.fromEntries(DEVICE_KEYS.map((k, i) => [k, flags[i]])) as Record<DeviceKey, boolean>,
    )
  }, [])

  useEffect(() => {
    if (!needsGrant) return
    refresh()
    return onHidChange(refresh)
  }, [needsGrant, refresh])

  const connect = async (device: DeviceConfig) => {
    await requestHidDevices([device])
    refresh()
  }

  return (
    <Section label="Devices">
      <div className={styles.body}>
        <p className={styles.hint}>
          {isNative()
            ? 'Devices are detected automatically whenever they’re plugged in — no setup needed.'
            : needsGrant
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
                {needsGrant &&
                  (granted[key] ? (
                    <span className={styles.granted}>
                      <Icon icon={CheckSolid} size={22} />
                      Access granted
                    </span>
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
