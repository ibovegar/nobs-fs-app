import { palette as p } from './palette'
import { spacing } from './spacing'

// Derive rgba helpers from hex for glow/dim variants
const hex2rgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// The semantic colour inputs a theme provides. Everything component CSS consumes
// (via var(--token)) is derived from these — so a new theme is just a new token set.
interface ThemeTokens {
  bg: string
  bgDarker: string
  bgPanel: string
  bgCard: string
  bgCardHi: string
  gradientSlateDusk: string
  border: string
  borderMid: string
  textDim: string
  textMid: string
  text: string
  textBright: string
  accent: string // CW direction / accent (lighter shade)
  accentMain: string
  accentDark: string
  danger: string // CCW direction / danger (lighter shade)
  dangerMain: string
  green: string
  greenDim: string
}

// Dark theme — derived from the rich palette so the values stay in one place.
const darkTokens: ThemeTokens = {
  bg: p.background.default,
  bgDarker: p.background.darker,
  bgPanel: p.background.card,
  bgCard: p.background.card,
  bgCardHi: p.action.selected,
  // "Slate Dusk" — a cool fade from card → default background
  gradientSlateDusk: 'linear-gradient(135deg, #252C33 0%, #1D2228 85%)',
  border: p.background.default,
  borderMid: p.grey[500],
  textDim: p.grey.A100,
  textMid: p.grey.A400,
  text: p.grey.A700,
  textBright: p.common.white,
  accent: p.primary.light,
  accentMain: p.primary.main,
  accentDark: p.primary.dark,
  danger: p.secondary.light,
  dangerMain: p.secondary.main,
  green: p.status.success,
  greenDim: p.status.successDim,
}

// Light theme — inverted backgrounds/text, accent darkened a touch for contrast on white.
const lightTokens: ThemeTokens = {
  bg: '#F5F7FA',
  // Header bar stays dark in light mode too — same value as the dark theme.
  bgDarker: p.background.darker,
  bgPanel: '#FFFFFF',
  bgCard: '#FFFFFF',
  bgCardHi: '#E8EDFF',
  // Product-image backdrop: a cool grey that fades darker so the panel image
  // stands out against the white cards.
  gradientSlateDusk: 'linear-gradient(135deg, #E4E8EE 0%, #C2CBD7 85%)',
  border: '#D7DDE5',
  borderMid: '#B4BEC7',
  textDim: '#6C7884',
  textMid: '#49555F',
  text: '#222C33',
  textBright: '#10161A',
  accent: p.primary.main,
  accentMain: p.primary.main,
  accentDark: p.primary.dark,
  danger: p.secondary.main,
  dangerMain: p.secondary.main,
  green: p.status.success,
  greenDim: p.status.successDim,
}

function buildCssVars(t: ThemeTokens): Record<string, string> {
  return {
    /* Backgrounds */
    '--bg': t.bg,
    '--bg-darker': t.bgDarker,
    '--bg-panel': t.bgPanel,
    '--bg-card': t.bgCard,
    '--bg-card-hi': t.bgCardHi,

    /* Gradients */
    '--bg-gradient-slate-dusk': t.gradientSlateDusk,

    /* Borders */
    '--border': t.border,
    '--border-mid': t.borderMid,

    /* Text scale */
    '--text-dim': t.textDim,
    '--text-mid': t.textMid,
    '--text': t.text,
    '--text-bright': t.textBright,

    /* Primary — sapphire (CW direction / accent) */
    '--accent': t.accent,
    '--accent-main': t.accentMain,
    '--accent-dark': t.accentDark,
    '--accent-dim': hex2rgba(t.accentMain, 0.14),
    '--accent-glow': hex2rgba(t.accent, 0.5),

    /* Secondary — red (CCW direction / danger) */
    '--danger': t.danger,
    '--danger-main': t.dangerMain,
    '--danger-dim': hex2rgba(t.dangerMain, 0.14),
    '--danger-glow': hex2rgba(t.danger, 0.5),

    /* Status */
    '--green': t.green,
    '--green-dim': t.greenDim,

    /* Spacing — 4px base scale */
    ...Object.fromEntries(Object.entries(spacing).map(([k, v]) => [`--sp-${k}`, v])),
  }
}

export const cssVarsByTheme = {
  dark: buildCssVars(darkTokens),
  light: buildCssVars(lightTokens),
} as const

// Back-compat: the default (dark) var map.
export const cssVars = cssVarsByTheme.dark

// Write a resolved theme's tokens to CSS custom properties on <html>.
export function injectThemeCssVars(theme: 'light' | 'dark' = 'dark') {
  const root = document.documentElement
  root.style.colorScheme = theme
  for (const [key, value] of Object.entries(cssVarsByTheme[theme])) {
    root.style.setProperty(key, value)
  }
}
