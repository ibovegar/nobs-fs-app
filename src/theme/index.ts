export { cssVars, injectThemeCssVars } from './cssVars'
export type { Palette } from './palette'
export { palette } from './palette'

import { palette } from './palette'

export const theme = { palette } as const
export type Theme = typeof theme
