import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router'
import {
  AuroraBackground,
  Header,
  markWelcomeSeen,
  Sidebar,
  Welcome,
  welcomeSeen,
} from '~/components'
import { useApproachEventLog, useEventLog, usePanelEventLog } from '~/hooks'
import { AutopilotSettings, DeviceSettings, Devices, Events, Home, Settings, Tools } from '~/pages'
import { watchSystemTheme } from '~/theme'
import styles from './App.module.css'

export default function App() {
  // The primary instance of each product is watched here (single owner) so the
  // connection state is shared by Home and Devices without the native HID bridge
  // ever opening the same device twice. Extra instances (module 2+) are watched
  // by their own Home cards.
  const autopilot = useEventLog()
  const approach = useApproachEventLog()
  const panel = usePanelEventLog()

  // First-run welcome screen — shown until the user dismisses it once.
  const [showWelcome, setShowWelcome] = useState(() => !welcomeSeen())
  const dismissWelcome = () => {
    markWelcomeSeen()
    setShowWelcome(false)
  }

  // Repaint live when the OS theme flips and the user is on 'system'.
  useEffect(() => watchSystemTheme(), [])

  return (
    <div className={styles.app}>
      <AuroraBackground />
      {showWelcome && <Welcome onDismiss={dismissWelcome} />}
      <Header />
      <div className={styles.layout}>
        <Sidebar />
        <main className={styles.body}>
          <Routes>
            <Route
              path="/"
              element={<Home autopilot={autopilot} approach={approach} panel={panel} />}
            />
            <Route
              path="/devices"
              element={
                <Devices
                  connected={{
                    autopilot: autopilot.isConnected,
                    approach: approach.isConnected,
                    panel: panel.isConnected,
                  }}
                />
              }
            />
            <Route
              path="/events"
              element={<Events autopilot={autopilot} approach={approach} panel={panel} />}
            />
            <Route
              path="/tools/:kind"
              element={<Tools autopilotButtons={autopilot.buttons} panelButtons={panel.buttons} />}
            />
            <Route path="/autopilot/settings" element={<AutopilotSettings />} />
            <Route
              path="/approach/settings"
              element={<DeviceSettings title="Approach settings" />}
            />
            <Route path="/panel/settings" element={<DeviceSettings title="Panel settings" />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
