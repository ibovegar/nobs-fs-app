import { CheckSolid } from '@lineiconshq/free-icons'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ConnectionIndicator, Icon, Section } from '~/components'
import { addInstance, removeInstance, useInstances, type WindyControl } from '~/hooks'
import { grantedFlags, isNative, onHidChange, requestHidDevices, webhidSupported } from '~/io'
import {
  type DeviceConfig,
  type DeviceKind,
  instancesFor,
  MAX_INSTANCES,
  productName,
  WINDY_NAME,
  WINDY_USB_PID,
  WINDY_USB_VID,
} from '~/panel'
import styles from './Devices.module.css'

const KINDS: DeviceKind[] = ['autopilot', 'approach', 'panel']

const hex4 = (n: number) => n.toString(16).padStart(4, '0')

interface Props {
  // Live connection of each product's primary instance (watched in App).
  connected: Record<DeviceKind, boolean>
  windy: WindyControl
}

export function Devices({ connected, windy }: Props) {
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
        {isNative() ? (
          <p className={styles.hint}>
            Every connected module is listed below automatically and disappears when unplugged —
            nothing to add or remove by hand. Give each physical unit its own ID with the
            configuration command (e.g. <code>SET_ID</code>) so multiple of the same product stay
            separate.
          </p>
        ) : (
          <p className={styles.hint}>
            Running more than one of the same module? Use <strong>+</strong> to add it, give each
            physical unit its own ID and name with the configuration command (e.g.{' '}
            <code>SET_ID</code>) so they stay separate. Remove any unit with its <strong>×</strong>{' '}
            (the last one of a product stays); removing the first promotes the next to primary.
          </p>
        )}

        {KINDS.map((kind) => {
          const list = instancesFor(kind, instances[kind])
          // Lowest tracked instance = the primary App watches; its live connection shows here.
          const primary = instances[kind][0]
          return (
            <div key={kind} className={styles.group}>
              <div className={styles.groupHeader}>
                <span className={styles.groupTitle}>{productName(kind)}</span>
                {!isNative() && (
                  <button
                    type="button"
                    className={styles.countBtn}
                    disabled={instances[kind].length >= MAX_INSTANCES}
                    onClick={() => addInstance(kind)}
                    aria-label={`Add one ${productName(kind)}`}
                  >
                    +
                  </button>
                )}
              </div>
              <ul className={styles.list}>
                {isNative() && list.length === 0 && (
                  <li className={styles.row}>
                    <span className={styles.id}>Not detected</span>
                  </li>
                )}
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
                    {!isNative() && list.length > 1 && (
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

        {/*
         * Windy sits outside the loop above: it isn't a HID device, so it has no
         * WebHID grant, no PID block on the bus, and no instance set to add to or
         * remove from. Its link is a serial port — one per machine — and the USB
         * identity below is the generic Arduino Uno every Windy shares. The
         * per-unit ID is a logical one the module reports over that link.
         */}
        <div className={styles.group}>
          <div className={styles.groupHeader}>
            <span className={styles.groupTitle}>{WINDY_NAME}</span>
          </div>
          <ul className={styles.list}>
            {!windy.supported ? (
              <li className={styles.row}>
                <span className={styles.id}>
                  Needs a Chromium browser (Chrome or Edge), or the desktop app
                </span>
              </li>
            ) : isNative() && !windy.isConnected ? (
              <li className={styles.row}>
                <span className={styles.id}>Not detected</span>
              </li>
            ) : (
              <li className={styles.row}>
                <div className={styles.info}>
                  <span className={styles.name}>{windy.identity?.name || WINDY_NAME}</span>
                  <span className={styles.id}>
                    {hex4(WINDY_USB_VID)}:{hex4(WINDY_USB_PID)}
                    {windy.identity ? ` · ID ${windy.identity.id}` : ''}
                  </span>
                </div>
                <ConnectionIndicator isConnected={windy.isConnected} />
                {windy.isConnected ? (
                  <button
                    type="button"
                    className={styles.connect}
                    onClick={() => void windy.disconnect()}
                    title="Release the COM port so the Arduino IDE can flash the board"
                  >
                    Disconnect
                  </button>
                ) : (
                  windy.needsGrant && (
                    <button
                      type="button"
                      className={styles.connect}
                      onClick={() => void windy.connect()}
                    >
                      Connect
                    </button>
                  )
                )}
              </li>
            )}
            {windy.error && !windy.isConnected && (
              <li className={styles.row}>
                <span className={styles.id}>{windy.error}</span>
              </li>
            )}
          </ul>
          {windy.isConnected && (
            <p className={styles.hint}>
              Windows gives a COM port to one program at a time, so while the app is connected the
              Arduino IDE can't flash Windy — uploads fail with <code>Access is denied</code>. Hit{' '}
              <strong>Disconnect</strong> before uploading, then reconnect afterwards.
            </p>
          )}
          {windy.needsGrant && !windy.isConnected && (
            <p className={styles.hint}>
              Windy is picked by <strong>COM port</strong>, not by USB ID: its per-unit identity
              lives in EEPROM and can only be read once the port is open, and clone boards use a
              different USB bridge. So the picker lists every serial port — choose the one Windy is
              on (the Arduino IDE's <strong>Tools → Port</strong> shows which).
            </p>
          )}
        </div>
      </div>
    </Section>
  )
}
