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
  grey: {
    50: '#18181c',
    100: '#1c1c21',
    200: '#202026',
    300: '#24242c',
    400: '#282833',
    500: '#2e2e38',
    600: '#343440',
    700: '#3e3e4a',
    800: '#4c4c58',
    900: '#5c5c68',
    A100: '#a0a0aa',
    A200: '#bcbcc6',
    A400: '#d8d8e0',
    A700: '#f0f0f4',
  },
  background: {
    paper: '#222931',
    default: '#171F24',
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
  gradient: {
    // "Slate Dusk" — cool blue-grey fade derived from background.paper (#222931)
    slateDusk: {
      light: '#2A323C',
      base: '#222931',
      dark: '#1C2128',
    },
  },
} as const

export type Palette = typeof palette
