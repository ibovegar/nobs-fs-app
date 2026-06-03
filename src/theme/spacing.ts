const BASE = 4

// Spacing scale: each step is 4px.
// Usage in TS: spacing[4] === '16px'
// Usage in CSS: var(--sp-4) === 16px
export const spacing = {
  0: `${BASE * 0}px`, //  0px
  1: `${BASE * 1}px`, //  4px
  2: `${BASE * 2}px`, //  8px
  3: `${BASE * 3}px`, // 12px
  4: `${BASE * 4}px`, // 16px
  5: `${BASE * 5}px`, // 20px
  6: `${BASE * 6}px`, // 24px
  7: `${BASE * 7}px`, // 28px
  8: `${BASE * 8}px`, // 32px
  10: `${BASE * 10}px`, // 40px
  12: `${BASE * 12}px`, // 48px
  16: `${BASE * 16}px`, // 64px
} as const

export type SpacingKey = keyof typeof spacing
export type SpacingValue = (typeof spacing)[SpacingKey]
