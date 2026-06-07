import '@fboes/horizontal-situation-indicator'
import { type HTMLAttributes, type RefAttributes, useEffect, useRef } from 'react'
import styles from './Hsi.module.css'

// `@fboes/horizontal-situation-indicator` ships a vanilla-JS web component with
// no React typings, so we declare its tag for JSX. React 19 exposes the global
// JSX namespace through the `react` module.
type HsiElementAttributes = HTMLAttributes<HTMLElement> &
  RefAttributes<HTMLElement> & {
    heading?: number
    'heading-select'?: number
    'nav1-course'?: number
    'nav1-deviation'?: number
    'nav1-bearing'?: number
    'nav2-course'?: number
    'nav2-deviation'?: number
  }

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'horizontal-situation-indicator': HsiElementAttributes
    }
  }
}

interface Props {
  heading?: number
  headingSelect?: number
  nav1Course?: number
  nav1Deviation?: number
  nav1Bearing?: number
}

export function Hsi({
  heading = 0,
  headingSelect = 0,
  nav1Course,
  nav1Deviation,
  nav1Bearing,
}: Props) {
  const ref = useRef<HTMLElement>(null)

  // The web component hard-codes several structural strokes to white
  // (stroke="#fff" in its SVG): the degree tick marks, the inner deviation-scale
  // dots, and the fat inner ring. Unlike the labels (a fill) these don't follow
  // --foreground-color, so they vanish on the light theme's white cards. Inject
  // a style into its (open) shadow root binding every white stroke to the theme.
  useEffect(() => {
    const root = ref.current?.shadowRoot
    if (!root || root.getElementById('hsi-theme-fix')) return
    const style = document.createElement('style')
    style.id = 'hsi-theme-fix'
    style.textContent = '[stroke="#fff"] { stroke: var(--foreground-color); }'
    root.appendChild(style)
  }, [])

  return (
    <div className={styles.hsi}>
      <horizontal-situation-indicator
        ref={ref}
        heading={heading}
        heading-select={headingSelect}
        nav1-course={nav1Course}
        nav1-deviation={nav1Deviation}
        nav1-bearing={nav1Bearing}
      />
    </div>
  )
}
