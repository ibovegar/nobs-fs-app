import { useEffect, useRef, useState } from 'react'
import type { ButtonState } from '~/panel'
import { Lever } from '../Lever'
import { PanelCard } from '../PanelCard'
import { PushPullKnob } from '../PushPullKnob'
import styles from './Approach.module.css'

// Flaps detents, top → bottom (matches the sim's five flap settings).
const FLAP_LABELS = ['LEVEL 1', 'LEVEL 2', 'LEVEL 3', 'LEVEL 4', 'LEVEL 5']
const FLAP_STAGES = FLAP_LABELS.length

// Nobs Approach exposes 3 physical controls, each reported as a button pair:
//   buttons[0/1] → Flaps lever   (momentary up/down — each press shifts one notch)
//   buttons[2/3] → Gear lever    (maintained — 2-position, up or down only)
//   buttons[4/5] → Parking brake (push-pull, maintained)
interface Props {
  buttons: ButtonState[]
}

export function Approach({ buttons }: Props) {
  const flapsUpCount = buttons[0].count
  const flapsDnCount = buttons[1].count
  const gearUp = buttons[2].pressed
  const gearDn = buttons[3].pressed
  const brakeOut = buttons[4].pressed
  const brakeIn = buttons[5].pressed

  // The flaps lever is momentary but holds a position: each up press retracts one
  // notch (toward LEVEL 1), each down press extends one (toward LEVEL 5). We track
  // the detent here and advance it by the change in press counts since the last frame.
  const [flaps, setFlaps] = useState(0)
  const prevCounts = useRef({ up: flapsUpCount, dn: flapsDnCount })

  useEffect(() => {
    const { up, dn } = prevCounts.current
    if (flapsUpCount === up && flapsDnCount === dn) return
    const delta = flapsDnCount - dn - (flapsUpCount - up)
    prevCounts.current = { up: flapsUpCount, dn: flapsDnCount }
    if (delta !== 0) {
      setFlaps((f) => Math.max(0, Math.min(FLAP_STAGES - 1, f + delta)))
    }
  }, [flapsUpCount, flapsDnCount])

  return (
    <div className={styles.grid}>
      <PanelCard active={flaps > 0}>
        <Lever
          label="FLAPS"
          shape="wide"
          stages={FLAP_STAGES}
          value={flaps}
          active={flaps > 0}
          readout={FLAP_LABELS[flaps]}
        />
      </PanelCard>
      <PanelCard active={gearUp || gearDn}>
        <Lever
          label="GEAR"
          shape="long"
          stages={2}
          value={gearDn ? 1 : 0}
          active={gearUp || gearDn}
          readout={gearDn ? 'DOWN' : 'UP'}
        />
      </PanelCard>
      <PanelCard active={brakeOut}>
        <PushPullKnob label="PARK BRK" pulled={brakeOut} pushed={brakeIn} />
      </PanelCard>
    </div>
  )
}
