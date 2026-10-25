import { type CSSProperties, useId } from 'react'
import { clampWindyLevel, WINDY_LEVELS, WINDY_MIN_LEVEL } from '~/panel'
import { PanelCard } from '../PanelCard'
import styles from './Windy.module.css'

interface Props {
  /** Latest state from the device, or null until it has reported one. */
  state: { power: 'ON' | 'OFF'; level: number } | null
  isConnected: boolean
  /** Whether a one-time port grant is still needed (web) — wording only; connecting
   *  itself lives on the Devices page, alongside every other module's setup. */
  needsGrant?: boolean
  /** Why the last connect attempt failed, shown in place of the generic hint. */
  error?: string | null
  onPower: (on: boolean) => void
  onSpeed: (level: number) => void
}

// Seven swept blades, one every 360/7°. The path is one blade pointing up,
// running from the hub (r=12) out to the tip (r=44.5), its tip swept forward
// in the direction of spin.
const FAN_BLADES = Array.from({ length: 7 }, (_, i) => (i * 360) / 7)
const BLADE_PATH =
  'M50 38 Q53.14 20.16 72.25 11.46 A44.5 44.5 0 0 1 90 30.49 ' +
  'Q70.14 30.55 57.39 40.54 A12 12 0 0 0 50 38 Z'
// Mounting holes in the frame's corners.
const FAN_SCREWS = [
  [8.5, 8.5],
  [91.5, 8.5],
  [8.5, 91.5],
  [91.5, 91.5],
]

// A fan as the box's fans look face-on: a black plastic frame and swept blades
// on a hub. Only the rotor turns, and
// only while the fans run; its period comes from the speed level (see --spin
// below), and the faster levels blur it a little, as a real fan's blades do.
function FanDisc({ spinning, level }: { spinning: boolean; level: number }) {
  // Gradient ids are document-global in SVG, so make them unique per fan.
  const id = useId()
  const speed = clampWindyLevel(level)

  return (
    <div className={styles.hub}>
      <svg className={styles.fan} viewBox="0 0 100 100" aria-hidden="true">
        <title>Fan</title>
        <defs>
          <linearGradient id={`${id}frame`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3a414b" />
            <stop offset="0.45" stopColor="#1a1e24" />
            <stop offset="1" stopColor="#08090c" />
          </linearGradient>
          <radialGradient id={`${id}throat`}>
            <stop offset="0.8" stopColor="#050608" />
            <stop offset="1" stopColor="#14171c" />
          </radialGradient>
          <linearGradient id={`${id}blade`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#59616c" />
            <stop offset="0.5" stopColor="#2c3138" />
            <stop offset="1" stopColor="#15181d" />
          </linearGradient>
          <radialGradient id={`${id}hub`} cx="0.38" cy="0.34" r="0.75">
            <stop offset="0" stopColor="#4a525d" />
            <stop offset="0.6" stopColor="#22262c" />
            <stop offset="1" stopColor="#0d0f12" />
          </radialGradient>
        </defs>

        {/* the frame, with its corner mounting holes */}
        <rect width="100" height="100" rx="12" fill={`url(#${id}frame)`} />
        {FAN_SCREWS.map(([cx, cy]) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r="3.4"
            fill="#030405"
            stroke="#4a515b"
            strokeWidth="0.8"
          />
        ))}
        {/* the round throat the blades turn in */}
        <circle cx="50" cy="50" r="46.5" fill={`url(#${id}throat)`} />

        <g
          className={`${styles.rotor}${spinning ? ` ${styles.spinning}` : ''}`}
          style={
            {
              '--spin': `${1.8 / speed}s`,
              '--blur': `${Math.max(0, speed - 2) * 0.35}px`,
            } as CSSProperties
          }
        >
          {FAN_BLADES.map((angle) => (
            <path
              key={angle}
              d={BLADE_PATH}
              transform={`rotate(${angle} 50 50)`}
              fill={`url(#${id}blade)`}
              stroke="#0a0b0e"
              strokeWidth="0.5"
            />
          ))}
          <circle cx="50" cy="50" r="13" fill={`url(#${id}hub)`} />
          <circle cx="50" cy="50" r="7.5" fill="none" stroke="#3b424c" strokeWidth="0.6" />
        </g>
      </svg>
    </div>
  )
}

/**
 * Nobs Windy's control surface. Unlike the other products' panels this one is
 * interactive rather than a read-only mirror: Windy's serial link is two-way, so
 * these controls drive the hardware exactly as its three physical push buttons
 * do (fan ON/OFF, speed up, speed down), and a press on the box itself pushes a
 * new state back that lands here the same way.
 */
export function Windy({
  state,
  isConnected,
  needsGrant = false,
  error = null,
  onPower,
  onSpeed,
}: Props) {
  const on = state?.power === 'ON'
  const level = state?.level ?? WINDY_MIN_LEVEL
  // Nothing is safe to drive until the device has told us where it actually is.
  const ready = isConnected && state !== null

  return (
    <div className={styles.grid}>
      <PanelCard active={on}>
        <span className={styles.label}>FAN</span>
        {/* No separate power button: the fan is the switch, and its spinning is
            the state. */}
        <button
          type="button"
          className={styles.fanButton}
          disabled={!ready}
          onClick={() => onPower(!on)}
          aria-label={on ? 'Turn fans off' : 'Turn fans on'}
          aria-pressed={on}
        >
          <FanDisc spinning={on} level={level} />
        </button>
        {/*
         * Disabled controls with no explanation read as a broken app, so still say
         * why they're inert — but only point at the fix. Connecting belongs on the
         * Devices page with every other module's setup, not scattered across Home.
         */}
        {!ready && (
          <span className={`${styles.status}${error && !isConnected ? ` ${styles.error}` : ''}`}>
            {error && !isConnected
              ? error
              : needsGrant && !isConnected
                ? 'Connect Windy on the Devices page'
                : isConnected
                  ? 'Waiting for the module to report in…'
                  : 'Not connected'}
          </span>
        )}
      </PanelCard>

      <PanelCard active={on}>
        <span className={styles.label}>SPEED</span>
        <div className={styles.bars}>
          {WINDY_LEVELS.map((n) => (
            <button
              key={n}
              type="button"
              // Bars up to the level always fill, but only glow while the fans are
              // actually running — the firmware keeps the level while it's off and
              // restores it, so hiding it entirely would misreport the hardware.
              className={[
                styles.bar,
                n <= level ? styles.barSet : '',
                on && n <= level ? styles.barLit : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ '--height': `${28 + n * 14}px` } as CSSProperties}
              disabled={!ready}
              onClick={() => onSpeed(n)}
              aria-label={`Set speed level ${n}`}
              aria-pressed={n === level}
            />
          ))}
        </div>
        <span className={`${styles.readout}${on ? ` ${styles.readoutOn}` : ''}`}>
          LEVEL {level}
        </span>
      </PanelCard>
    </div>
  )
}
