import { useLayoutEffect, useRef, useState } from 'react'
import panelOffImg from '~/assets/images/nobs_panel_sw_off.png'
import panelOnImg from '~/assets/images/nobs_panel_sw_on.png'
import { type ButtonState, PANEL_SWITCHES } from '~/panel'
import styles from './PanelPhoto.module.css'

// Native photo resolution. Switch centers below are measured in this pixel
// space, then scaled to whatever size the photo actually renders at.
const IMAGE_WIDTH = 3040
const IMAGE_HEIGHT = 1082

// The panel is lit from above, so every knob's cast shadow falls straight
// down — never upward. A switch's clip box only needs to start at the
// knob's own top edge (no wasted margin above it) and can safely run all
// the way to the bottom of the photo to fully contain that shadow, however
// far down it reaches.
const BUTTON_TOP_MARGIN = 150
// The bottom row sits in the top row's shadow path, so its box starts much
// closer to its own knob — masking away just the knob's own top edge — and
// leaves the rest of the gap above it to the top row's taller box.
const BUTTON_TOP_MARGIN_BOTTOM_ROW = 100

const SWITCH_CENTERS: Record<string, { x: number; y: number }> = {
  SW1: { x: 534, y: 725 },
  SW2: { x: 534, y: 363 },
  SW3: { x: 1191, y: 725 },
  SW4: { x: 1191, y: 363 },
  SW5: { x: 1850, y: 725 },
  SW6: { x: 1850, y: 363 },
  SW7: { x: 2510, y: 725 },
  SW8: { x: 2510, y: 363 },
}

// Column walls are the midpoints between neighboring switch centers, so
// columns tile the photo's width with no gaps and no overlap.
function colBoundsFor(xCenters: number[], width: number) {
  const sorted = Array.from(new Set(xCenters)).sort((a, b) => a - b)
  const bounds = [0]
  for (let i = 0; i < sorted.length - 1; i++) bounds.push((sorted[i] + sorted[i + 1]) / 2)
  bounds.push(width)
  return sorted.map((x, i) => [x, bounds[i], bounds[i + 1]] as const)
}
const COL_BOUNDS = new Map(
  colBoundsFor(
    Object.values(SWITCH_CENTERS).map((p) => p.x),
    IMAGE_WIDTH,
  ).map(([x, left, right]) => [x, { left, right }]),
)

const BOTTOM_ROW_Y = Math.max(...Object.values(SWITCH_CENTERS).map((p) => p.y))

// Each switch's clip box, sorted top to bottom — later (lower) rows are
// painted last, so a lower row's own patch always repaints over any shadow
// an upper row's taller box extended down into its territory.
const SWITCH_BOXES = PANEL_SWITCHES.map((sw) => {
  const { x, y } = SWITCH_CENTERS[sw.label]
  const { left, right } = COL_BOUNDS.get(x) ?? { left: 0, right: IMAGE_WIDTH }
  const margin = y === BOTTOM_ROW_Y ? BUTTON_TOP_MARGIN_BOTTOM_ROW : BUTTON_TOP_MARGIN
  return { sw, left, right, top: y - margin, bottom: IMAGE_HEIGHT }
}).sort((a, b) => a.top - b.top)

interface Props {
  buttons: ButtonState[]
}

export function PanelPhoto({ buttons }: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = frameRef.current
    if (!el) return
    setWidth(el.getBoundingClientRect().width)
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const scale = width / IMAGE_WIDTH

  return (
    <div ref={frameRef} className={styles.frame}>
      {/* Fills the decorative strip above the top row, which no switch's box
          covers; identical in both photos, so either works. */}
      <img src={panelOnImg} alt="Nobs Panel" className={styles.layer} />
      {width > 0 &&
        SWITCH_BOXES.map(({ sw, left, right, top, bottom }) => {
          const down = buttons[sw.down].pressed
          const insetTop = top * scale
          const insetRight = (IMAGE_WIDTH - right) * scale
          const insetBottom = (IMAGE_HEIGHT - bottom) * scale
          const insetLeft = left * scale
          return (
            <img
              key={sw.label}
              src={down ? panelOffImg : panelOnImg}
              alt=""
              className={styles.layer}
              style={{
                clipPath: `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px)`,
              }}
            />
          )
        })}
    </div>
  )
}
