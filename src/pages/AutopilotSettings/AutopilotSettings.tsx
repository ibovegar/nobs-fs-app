import { ArrowLeftOutlined, CheckSolid } from '@lineiconshq/free-icons'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Icon, Section } from '~/components'
import {
  configConnected,
  connectConfigPort,
  reconnectConfigPort,
  sendAcceleration,
  serialSupported,
} from '~/io'
import { ENCODER_LABELS, NUM_ENCODERS } from '~/panel'
import styles from './AutopilotSettings.module.css'

const STORAGE_PREFIX = 'nobs.accelSensitivity' // per-encoder percent: `${STORAGE_PREFIX}.${i}`
const LEGACY_KEY = 'nobs.accelSensitivity' // pre-per-encoder single value, used as the fallback
const DEFAULT_PCT = 100

// Firmware takes 0..255; the UI works in percent.
const pctToByte = (pct: number) => Math.round((pct / 100) * 255)

const clampPct = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : DEFAULT_PCT)

// Per-encoder value, falling back to the legacy single value (pre per-encoder), then the default.
function loadPct(i: number): number {
  const raw = localStorage.getItem(`${STORAGE_PREFIX}.${i}`) ?? localStorage.getItem(LEGACY_KEY)
  return raw === null ? DEFAULT_PCT : clampPct(Number(raw))
}

const loadPcts = () => Array.from({ length: NUM_ENCODERS }, (_, i) => loadPct(i))

// Push every encoder's stored value to the panel, sequentially — the web writer
// can't be locked twice at once. Used after a (re)connect to re-assert state.
async function pushAll(): Promise<boolean> {
  const values = loadPcts()
  let ok = true
  for (let i = 0; i < values.length; i++) {
    ok = (await sendAcceleration(i, pctToByte(values[i]))) && ok
  }
  return ok
}

export function AutopilotSettings() {
  const navigate = useNavigate()
  const supported = serialSupported()
  const [pcts, setPcts] = useState<number[]>(loadPcts)
  const [connected, setConnected] = useState(false)
  // Per-encoder counter, bumped on each successful save → replays that row's blink.
  const [savedTicks, setSavedTicks] = useState<number[]>(() => Array(NUM_ENCODERS).fill(0))
  const sendTimers = useRef<(number | undefined)[]>(Array(NUM_ENCODERS).fill(undefined))
  const connecting = useRef(false)

  // Silently reuse an already-granted (web) / detected (native) port on load and
  // re-assert all saved values — no prompt. (Firmware persists them in EEPROM.)
  useEffect(() => {
    if (!supported) return
    let alive = true
    reconnectConfigPort().then((ok) => {
      if (!alive) return
      setConnected(ok)
      if (ok) void pushAll()
    })
    return () => {
      alive = false
    }
  }, [supported])

  // Coalesce a slider's drags into one write (+ one EEPROM write) when it settles.
  const pushSoon = (index: number, value: number) => {
    window.clearTimeout(sendTimers.current[index])
    sendTimers.current[index] = window.setTimeout(() => {
      void sendAcceleration(index, pctToByte(value)).then((ok) => {
        setConnected(ok)
        if (ok) setSavedTicks((t) => t.map((v, i) => (i === index ? v + 1 : v)))
      })
    }, 200)
  }

  const onChange = (index: number, value: number) => {
    setPcts((prev) => prev.map((v, i) => (i === index ? value : v)))
    localStorage.setItem(`${STORAGE_PREFIX}.${index}`, String(value))
    // First adjustment while disconnected: open the port within this gesture so the
    // web grant prompt is allowed (native just detects). Guarded against re-prompts.
    if (!configConnected() && !connecting.current) {
      connecting.current = true
      connectConfigPort()
        .then((ok) => {
          setConnected(ok)
          if (ok) void pushAll()
        })
        .catch(() => setConnected(false))
        .finally(() => {
          connecting.current = false
        })
    }
    pushSoon(index, value)
  }

  return (
    <>
      <button type="button" className={styles.back} onClick={() => navigate(-1)}>
        <Icon icon={ArrowLeftOutlined} size={24} />
        <span>Back</span>
      </button>
      <Section label="Autopilot settings">
        <div className={styles.body}>
          <div className={styles.group}>
            <div className={styles.groupHead}>
              <h3 className={styles.title}>Encoder acceleration</h3>
              <p className={styles.hint}>
                How much further each encoder moves a value when you spin it quickly. Higher means
                fast spins jump further per detent; 0% turns acceleration off (always one step per
                detent). Set per knob and saved to the panel.
              </p>
            </div>

            <div className={styles.rows}>
              {ENCODER_LABELS.map((label, i) => (
                <div key={label} className={styles.row}>
                  <span className={styles.rowLabel}>{label}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={pcts[i]}
                    onChange={(e) => onChange(i, Number(e.target.value))}
                    className={styles.slider}
                  />
                  <span className={styles.value}>{pcts[i]}%</span>
                  {/*
                   * Always render the tag (hidden until the first save) so its
                   * grid column reserves a constant width and the slider doesn't
                   * resize when it appears. key=savedTicks[i] remounts on each
                   * save so the blink replays.
                   */}
                  <span
                    key={savedTicks[i]}
                    className={savedTicks[i] ? `${styles.saved} ${styles.flash}` : styles.saved}
                  >
                    <Icon icon={CheckSolid} size={22} />
                    Saved
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.status}>
              {!supported ? (
                <span className={styles.muted}>
                  Saved on this device. Open in Chrome or Edge to apply it to the panel.
                </span>
              ) : connected ? (
                <span className={styles.muted}>Connected to panel</span>
              ) : (
                <span className={styles.muted}>Move a slider to apply it to the panel.</span>
              )}
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}
