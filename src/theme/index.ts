export { cssVars, injectThemeCssVars } from './cssVars'
export type { Palette } from './palette'
export { palette } from './palette'
export type { SpacingKey, SpacingValue } from './spacing'
export { spacing } from './spacing'

import { palette } from './palette'
import { spacing } from './spacing'

export const theme = { palette, spacing } as const
export type Theme = typeof theme
