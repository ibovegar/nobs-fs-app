import { useEffect, useRef, useState } from 'react'
import { Hsi } from '~/components'
import { type ButtonState, ccwButton, cwButton, pushButton } from '~/panel'
import styles from './Tools.module.css'

// Each encoder detent nudges the selected HSI field 5°.
const DEGREES_PER_DETENT = 5

type Field = 'heading' | 'headingSelect' | 'nav1Course' | 'nav1Bearing'

const FIELDS: { id: Field; label: string }[] = [
  { id: 'heading', label: 'Heading' },
  { id: 'headingSelect', label: 'Heading bug' },
  { id: 'nav1Course', label: 'NAV1 course' },
  { id: 'nav1Bearing', label: 'NAV1 bearing' },
]

const ZERO: Record<Field, number> = {
  heading: 0,
  headingSelect: 0,
  nav1Course: 0,
  nav1Bearing: 0,
}

const mod360 = (deg: number) => ((deg % 360) + 360) % 360

interface Props {
  label: string
  encoder: number
  buttons: ButtonState[]
}

export function HsiTool({ label, encoder, buttons }: Props) {
  const net = buttons[cwButton(encoder)].count - buttons[ccwButton(encoder)].count
  const pushes = buttons[pushButton(encoder)].count

  const [active, setActive] = useState<Field>('headingSelect')
  const [values, setValues] = useState<Record<Field, number>>(ZERO)

  const prevNet = useRef(net)
  const prevPushes = useRef(pushes)
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    // Encoder push → reset every field to 0°.
    if (pushes !== prevPushes.current) {
      prevPushes.current = pushes
      prevNet.current = net
      setValues(ZERO)
      return
    }
    // Encoder turn → apply the rotation delta to the selected field.
    const delta = net - prevNet.current
    if (delta !== 0) {
      prevNet.current = net
      setValues((v) => ({
        ...v,
        [activeRef.current]: v[activeRef.current] + delta * DEGREES_PER_DETENT,
      }))
    }
  }, [net, pushes])

  return (
    <div className={styles.tool}>
      <span className={styles.toolLabel}>{label}</span>
      <div className={styles.layout}>
        <Hsi
          heading={values.heading}
          headingSelect={values.headingSelect}
          nav1Course={values.nav1Course}
          nav1Bearing={values.nav1Bearing}
        />
        <div className={styles.fields}>
          {FIELDS.map((field) => (
            <button
              key={field.id}
              type="button"
              className={`${styles.field}${active === field.id ? ` ${styles.fieldActive}` : ''}`}
              onClick={() => setActive(field.id)}
            >
              <span>{field.label}</span>
              <span className={styles.value}>{mod360(values[field.id])}°</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
