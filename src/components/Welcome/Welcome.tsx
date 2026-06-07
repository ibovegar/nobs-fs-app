import { useNavigate } from 'react-router'
import { isNative, webhidSupported } from '~/io'
import styles from './Welcome.module.css'

interface Props {
  onDismiss: () => void
}

// The getting-started copy differs by environment: the native shell auto-detects
// the panel, whereas a browser needs a one-time permission grant (or a control
// actuation on browsers without WebHID).
function getStarted(): { mode: string; steps: string[] } {
  if (isNative()) {
    return {
      mode: 'Desktop app',
      steps: [
        'Plug your nobs autopilot panel into a USB port.',
        'Open Devices — the panel is detected automatically, no setup needed.',
        'Launch MSFS 2024 and start flying; your switches and knobs are live.',
      ],
    }
  }
  if (webhidSupported()) {
    return {
      mode: 'Browser',
      steps: [
        'Plug your nobs autopilot panel into a USB port.',
        'Open Devices and click Connect, then pick your panel in the browser prompt.',
        'Access is remembered for next time — launch MSFS 2024 and start flying.',
      ],
    }
  }
  return {
    mode: 'Browser',
    steps: [
      'Plug your nobs autopilot panel into a USB port.',
      'Open Devices, then turn a knob or flip a switch so this browser registers the panel.',
      'Once it appears as connected, launch MSFS 2024 and start flying.',
    ],
  }
}

export function Welcome({ onDismiss }: Props) {
  const navigate = useNavigate()
  const { mode, steps } = getStarted()

  const goToDevices = () => {
    onDismiss()
    navigate('/devices')
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.card} role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <span className={styles.badge}>{mode}</span>
        <h2 id="welcome-title" className={styles.title}>
          Welcome to nobs-fs
        </h2>
        <p className={styles.lede}>
          A live monitor for your custom MSFS 2024 autopilot panel. Here's how to get started:
        </p>

        <ol className={styles.steps}>
          {steps.map((step, i) => (
            <li key={step} className={styles.step}>
              <span className={styles.stepNum}>{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onDismiss}>
            Dismiss
          </button>
          <button type="button" className={styles.primary} onClick={goToDevices}>
            Go to Devices
          </button>
        </div>
      </div>
    </div>
  )
}
