import '@fboes/horizontal-situation-indicator'
import type { HTMLAttributes } from 'react'
import styles from './Hsi.module.css'

// `@fboes/horizontal-situation-indicator` ships a vanilla-JS web component with
// no React typings, so we declare its tag for JSX. React 19 exposes the global
// JSX namespace through the `react` module.
type HsiElementAttributes = HTMLAttributes<HTMLElement> & {
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
  return (
    <div className={styles.hsi}>
      <horizontal-situation-indicator
        heading={heading}
        heading-select={headingSelect}
        nav1-course={nav1Course}
        nav1-deviation={nav1Deviation}
        nav1-bearing={nav1Bearing}
      />
    </div>
  )
}
