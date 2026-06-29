import { CheckSolid } from '@lineiconshq/free-icons'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ConnectionIndicator, Icon, Section } from '~/components'
import { addInstance, removeInstance, useInstances } from '~/hooks'
import { grantedFlags, isNative, onHidChange, requestHidDevices, webhidSupported } from '~/io'
import {
  type DeviceConfig,
  type DeviceKind,
  instancesFor,
  MAX_INSTANCES,
  productName,
} from '~/panel'
import styles from './Devices.module.css'

const KINDS: DeviceKind[] = ['autopilot', 'approach', 'panel']

interface Props {
  // Live connection of each product's primary instance (watched in App).
  connected: Record<DeviceKind, boolean>
}

export function Devices({ connected }: Props) {
  // The native shell uses the Tauri HID bridge, which enumerates devices itself
  // — no per-device permission grant. WebHID's one-time grant is web-only.
  const needsGrant = !isNative() && webhidSupported()
  const instances = useInstances()
  const devices = useMemo(() => KINDS.flatMap((k) => instancesFor(k, instances[k])), [instances])

  const [granted, setGranted] = useState<Record<string, boolean>>({})
  const refresh = useCallback(async () => {
    const flags = await grantedFlags(devices)
    setGranted(Object.fromEntries(devices.map((d, i) => [d.key, flags[i]])))
  }, [devices])

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
            ? 'Devices are detected automatically whenever they’re plugged in, no setup needed.'
            : needsGrant
              ? "Grant one-time access to a device; it's then detected automatically whenever it's plugged in."
              : 'Automatic detection needs a Chromium browser (Chrome or Edge). Otherwise a device is detected once you actuate one of its controls.'}
        </p>
        <p className={styles.hint}>
          Running more than one of the same module? Use <strong>+</strong> to add it, give each
          physical unit its own ID and name with the configuration command (e.g. <code>SET_ID</code>
          ) so they stay separate. Remove any unit with its <strong>×</strong> (the last one of a
          product stays); removing the first promotes the next to primary.
        </p>

        {KINDS.map((kind) => {
          const list = instancesFor(kind, instances[kind])
          // Lowest tracked instance = the primary App watches; its live connection shows here.
          const primary = instances[kind][0]
          return (
            <div key={kind} className={styles.group}>
              <div className={styles.groupHeader}>
                <span className={styles.groupTitle}>{productName(kind)}</span>
                <button
                  type="button"
                  className={styles.countBtn}
                  disabled={instances[kind].length >= MAX_INSTANCES}
                  onClick={() => addInstance(kind)}
                  aria-label={`Add one ${productName(kind)}`}
                >
                  +
                </button>
              </div>
              <ul className={styles.list}>
                {list.map((device) => (
                  <li key={device.key} className={styles.row}>
                    <div className={styles.info}>
                      <span className={styles.name}>{device.name}</span>
                      <span className={styles.id}>
                        {device.vid}:{device.pid}
                      </span>
                    </div>
                    {device.instance === primary && (
                      <ConnectionIndicator isConnected={connected[kind]} />
                    )}
                    {needsGrant &&
                      (granted[device.key] ? (
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
                    {list.length > 1 && (
                      <button
                        type="button"
                        className={styles.remove}
                        onClick={() => removeInstance(kind, device.instance)}
                        aria-label={`Remove ${device.name}`}
                        title={`Remove ${device.name}`}
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </Section>
  )
}
