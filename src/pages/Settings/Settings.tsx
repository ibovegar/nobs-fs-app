import { useState } from 'react'
import { Section } from '~/components'
import { loadThemeMode, setThemeMode, type ThemeMode } from '~/theme'
import styles from './Settings.module.css'

const THEME_OPTIONS: { value: ThemeMode; label: string; hint: string }[] = [
  { value: 'light', label: 'Light', hint: 'Always light' },
  { value: 'dark', label: 'Dark', hint: 'Always dark' },
  { value: 'system', label: 'System', hint: 'Match the OS' },
]

export function Settings() {
  const [mode, setMode] = useState<ThemeMode>(loadThemeMode)

  const onSelect = (value: ThemeMode) => {
    setMode(value)
    setThemeMode(value)
  }

  return (
    <Section label="Settings">
      <div className={styles.body}>
        <div className={styles.group}>
          <div className={styles.groupHead}>
            <h3 className={styles.title}>Appearance</h3>
            <p className={styles.hint}>
              Choose a colour theme. System follows your operating system's light/dark setting.
            </p>
          </div>

          <div className={styles.segmented}>
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={mode === opt.value}
                className={`${styles.segment}${mode === opt.value ? ` ${styles.segmentActive}` : ''}`}
                onClick={() => onSelect(opt.value)}
              >
                <span className={styles.segmentLabel}>{opt.label}</span>
                <span className={styles.segmentHint}>{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}
