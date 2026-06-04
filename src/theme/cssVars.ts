import { palette as p } from './palette'
import { spacing } from './spacing'

// Derive rgba helpers from hex for glow/dim variants
const hex2rgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export const cssVars: Record<string, string> = {
  /* Backgrounds */
  '--bg': p.background.default,
  '--bg-darker': p.background.darker,
  '--bg-panel': p.background.card,
  '--bg-card': p.background.card,
  '--bg-card-hi': p.action.selected,

  /* Gradients — "Slate Dusk", a cool fade from card → default background */
  '--bg-gradient-slate-dusk': `linear-gradient(135deg, #252C33 0%, ${p.background.default} 85%)`,

  /* Borders */
  '--border': p.background.default,
  '--border-mid': p.grey[500],

  /* Text scale */
  '--text-dim': p.grey.A100,
  '--text-mid': p.grey.A400,
  '--text': p.grey.A700,
  '--text-bright': p.common.white,

  /* Primary — sapphire (CW direction / accent) */
  '--accent': p.primary.light,
  '--accent-main': p.primary.main,
  '--accent-dark': p.primary.dark,
  '--accent-dim': hex2rgba(p.primary.main, 0.14),
  '--accent-glow': hex2rgba(p.primary.light, 0.5),

  /* Secondary — red (CCW direction / danger) */
  '--danger': p.secondary.light,
  '--danger-main': p.secondary.main,
  '--danger-dim': hex2rgba(p.secondary.main, 0.14),
  '--danger-glow': hex2rgba(p.secondary.light, 0.5),

  /* Status */
  '--green': p.status.success,
  '--green-dim': p.status.successDim,

  /* Spacing — 4px base scale */
  ...Object.fromEntries(Object.entries(spacing).map(([k, v]) => [`--sp-${k}`, v])),
}

export function injectThemeCssVars() {
  const root = document.documentElement
  for (const [key, value] of Object.entries(cssVars)) {
    root.style.setProperty(key, value)
  }
}
