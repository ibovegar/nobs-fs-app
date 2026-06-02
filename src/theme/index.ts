export { palette } from './palette'
export type { Palette } from './palette'
export { cssVars, injectThemeCssVars } from './cssVars'

import { palette } from './palette'

export const theme = { palette } as const
export type Theme = typeof theme
