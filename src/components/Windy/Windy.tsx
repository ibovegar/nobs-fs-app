import type { CSSProperties } from 'react'
import { clampWindyLevel, WINDY_LEVELS, WINDY_MAX_LEVEL, WINDY_MIN_LEVEL } from '~/panel'
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

// A fan blade rosette. The disc spins only while the fans are running, and its
// period is driven by the speed level (see --spin below).
function FanDisc({ spinning, level }: { spinning: boolean; level: number }) {
  return (
    <div className={styles.hub}>
      <svg
        className={`${styles.fan}${spinning ? ` ${styles.spinning}` : ''}`}
        style={{ '--spin': `${1.8 / clampWindyLevel(level)}s` } as CSSProperties}
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <title>Fan</title>
        {/*
         * One blade per quadrant, each sweeping from the spindle out to the rim
         * (r=48) and spanning ~26° of arc there, leaving a ~64° gap between them.
         * Blades wide enough to nearly meet filled the disc but killed the
         * silhouette — it read as a solid plate with four scratches rather than a
         * fan. The arc endpoints sit exactly on the r=48 circle, which keeps the
         * rosette centred; off it, SVG re-centres each arc and the blades splay.
         */}
        {[0, 90, 180, 270].map((angle) => (
          <path
            key={angle}
            d="M50 50 C 68 41, 88 39, 97.8 45.8 A 48 48 0 0 1 94.8 67.2 C 84 62, 62 56, 50 50 Z"
            transform={`rotate(${angle} 50 50)`}
          />
        ))}
        <circle cx="50" cy="50" r="8" className={styles.spindle} />
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
        <FanDisc spinning={on} level={level} />
        <button
          type="button"
          className={`${styles.power}${on ? ` ${styles.powerOn}` : ''}`}
          disabled={!ready}
          onClick={() => onPower(!on)}
          aria-pressed={on}
        >
          {on ? 'ON' : 'OFF'}
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
        <div className={styles.stepper}>
          <button
            type="button"
            className={styles.step}
            disabled={!ready || level <= WINDY_MIN_LEVEL}
            onClick={() => onSpeed(level - 1)}
            aria-label="Decrease fan speed"
          >
            −
          </button>
          <span className={`${styles.readout}${on ? ` ${styles.readoutOn}` : ''}`}>
            LEVEL {level}
          </span>
          <button
            type="button"
            className={styles.step}
            disabled={!ready || level >= WINDY_MAX_LEVEL}
            onClick={() => onSpeed(level + 1)}
            aria-label="Increase fan speed"
          >
            +
          </button>
        </div>
      </PanelCard>
    </div>
  )
}
