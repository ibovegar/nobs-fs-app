import { injectThemeCssVars } from './cssVars'

// 'system' follows the OS preference live; 'light'/'dark' pin it.
export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'nobs.themeMode'
const DEFAULT_MODE: ThemeMode = 'dark'

const isMode = (v: string | null): v is ThemeMode => v === 'light' || v === 'dark' || v === 'system'

export function loadThemeMode(): ThemeMode {
  const raw = localStorage.getItem(STORAGE_KEY)
  return isMode(raw) ? raw : DEFAULT_MODE
}

const prefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches

// Map a mode to the concrete theme to paint.
export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return prefersDark() ? 'dark' : 'light'
  return mode
}

// Persist the choice and repaint the CSS variables.
export function setThemeMode(mode: ThemeMode) {
  localStorage.setItem(STORAGE_KEY, mode)
  injectThemeCssVars(resolveTheme(mode))
}

// Apply the stored mode (call once on startup).
export function applyStoredTheme() {
  injectThemeCssVars(resolveTheme(loadThemeMode()))
}

// Re-paint when the OS theme changes, but only while the user is on 'system'.
// Returns an unsubscribe fn.
export function watchSystemTheme(): () => void {
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    if (loadThemeMode() === 'system') injectThemeCssVars(resolveTheme('system'))
  }
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}
