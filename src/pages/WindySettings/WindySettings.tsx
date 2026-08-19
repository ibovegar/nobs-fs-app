import { ArrowLeftOutlined, CheckSolid } from '@lineiconshq/free-icons'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Icon, Section } from '~/components'
import type { WindyControl } from '~/hooks'
import {
  WINDY_MAX_INSTANCES,
  WINDY_USB_PID,
  WINDY_USB_VID,
  windyIdFor,
  windyInstanceOf,
  windyNameFor,
} from '~/panel'
import styles from './WindySettings.module.css'

const hex4 = (n: number) => n.toString(16).padStart(4, '0')

const SLOTS = Array.from({ length: WINDY_MAX_INSTANCES }, (_, i) => i + 1)

interface Props {
  windy: WindyControl
}

/**
 * Windy's logical identity (SET_ID). This is the one setting the firmware
 * actually stores, and it behaves unlike its ESP32 siblings: on Panel/Approach/
 * Autopilot SET_ID rewrites the board's USB descriptor, but the Uno's VID/PID
 * lives in a separate 16U2 chip the sketch can't touch. So this is bookkeeping
 * for the app only — the OS keeps seeing a generic Arduino Uno either way.
 */
export function WindySettings({ windy }: Props) {
  const navigate = useNavigate()
  const { identity, isConnected, setIdentity } = windy

  // The slot the device currently reports, defaulting to unit 1 until it answers.
  const current = identity ? windyInstanceOf(identity.id) : null
  const [slot, setSlot] = useState(current ?? 1)
  const [name, setName] = useState(identity?.name ?? '')
  const [saved, setSaved] = useState(0)

  // Adopt whatever the device reports — it's the source of truth, and the values
  // only arrive once GET_ID has answered (after the link comes up).
  useEffect(() => {
    if (!identity) return
    setSlot(windyInstanceOf(identity.id) ?? 1)
    setName(identity.name)
  }, [identity])

  const id = windyIdFor(slot)
  const trimmed = name.trim()
  const dirty = identity !== null && (identity.id !== id || identity.name !== trimmed)

  const save = async () => {
    if (!trimmed) return
    if (await setIdentity(id, trimmed)) setSaved((n) => n + 1)
  }

  return (
    <>
      <button type="button" className={styles.back} onClick={() => navigate(-1)}>
        <Icon icon={ArrowLeftOutlined} size={24} />
        <span>Back</span>
      </button>
      <Section label="Windy settings">
        <div className={styles.body}>
          <div className={styles.group}>
            <div className={styles.groupHead}>
              <h3 className={styles.title}>Module identity</h3>
              <p className={styles.hint}>
                Give each physical Windy its own ID and name so the app can tell several apart.
                Unlike the other modules this does <strong>not</strong> change what the board looks
                like on the USB bus — every Windy stays a generic Arduino Uno (
                <code>
                  {hex4(WINDY_USB_VID)}:{hex4(WINDY_USB_PID)}
                </code>
                ), because the Uno's USB identity lives in a separate chip the firmware can't
                rewrite. It takes effect immediately, no reboot needed.
              </p>
            </div>

            <div className={styles.rows}>
              <div className={styles.row}>
                <span className={styles.rowLabel}>ID</span>
                <select
                  className={styles.select}
                  value={slot}
                  disabled={!isConnected}
                  onChange={(e) => {
                    const next = Number(e.target.value)
                    setSlot(next)
                    // Keep the name in step while it's still the default for its
                    // slot, so picking "2nd Windy" doesn't leave it named "Nobs Windy".
                    if (name.trim() === windyNameFor(slot)) setName(windyNameFor(next))
                  }}
                >
                  {SLOTS.map((n) => (
                    <option key={n} value={n}>
                      {windyIdFor(n)} — {windyNameFor(n)}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.row}>
                <span className={styles.rowLabel}>Name</span>
                <input
                  type="text"
                  className={styles.input}
                  value={name}
                  maxLength={31}
                  disabled={!isConnected}
                  placeholder={windyNameFor(slot)}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className={styles.row}>
                <span className={styles.rowLabel} />
                <button
                  type="button"
                  className={styles.save}
                  disabled={!isConnected || !trimmed || !dirty}
                  onClick={() => void save()}
                >
                  Save to module
                </button>
                {/* key=saved remounts the tag so the blink replays on every save. */}
                <span
                  key={saved}
                  className={saved ? `${styles.saved} ${styles.flash}` : styles.saved}
                >
                  <Icon icon={CheckSolid} size={22} />
                  Saved
                </span>
              </div>
            </div>

            <div className={styles.status}>
              <span className={styles.muted}>
                {!windy.supported
                  ? 'Configuring Windy needs a Chromium browser (Chrome or Edge), or the desktop app.'
                  : isConnected
                    ? identity
                      ? `Connected — module reports ${identity.id} “${identity.name}”`
                      : 'Connected — reading the module’s identity…'
                    : 'Not connected. Connect Windy from the Devices page first.'}
              </span>
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}
