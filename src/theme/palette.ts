const sapphire = {
  light: '#809fff',
  main: '#2040e0',
  dark: '#152a8a',
  contrastText: '#fff',
} as const

export const palette = {
  mode: 'dark' as const,
  primary: sapphire,
  secondary: {
    light: '#f4c5c2',
    main: '#f44336',
    dark: '#b71c1c',
    contrastText: '#000',
  },
  // Cool blue-grey ramp, hue-aligned with the backgrounds (darker → default → card → text)
  grey: {
    50: '#161D22',
    100: '#1B232A',
    200: '#222C33',
    300: '#2A343C',
    400: '#323D46',
    500: '#3C4751',
    600: '#49555F',
    700: '#586571',
    800: '#6C7884',
    900: '#828E99',
    A100: '#9AA5AF',
    A200: '#B4BEC7',
    A400: '#D2D9DF',
    A700: '#EEF1F3',
  },
  background: {
    card: '#222931',
    default: '#171F24',
    darker: '#10161A',
  },
  common: {
    black: '#000',
    white: '#fff',
  },
  action: {
    hover: '#3e3e4a',
    selected: '#1a2a58',
    disabledBackground: '#3e3e4a',
  },
  status: {
    success: '#10b981',
    successDim: 'rgba(16, 185, 129, 0.15)',
  },
} as const

export type Palette = typeof palette
