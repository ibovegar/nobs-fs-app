export { cssVars, cssVarsByTheme, injectThemeCssVars } from './cssVars'
export type { Palette } from './palette'
export { palette } from './palette'
export type { SpacingKey, SpacingValue } from './spacing'
export { spacing } from './spacing'
export type { ResolvedTheme, ThemeMode } from './themeMode'
export {
  applyStoredTheme,
  loadThemeMode,
  resolveTheme,
  setThemeMode,
  watchSystemTheme,
} from './themeMode'

import { palette } from './palette'
import { spacing } from './spacing'

export const theme = { palette, spacing } as const
export type Theme = typeof theme
