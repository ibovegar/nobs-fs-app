import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router'
import { Header, markWelcomeSeen, Sidebar, Welcome, welcomeSeen } from '~/components'
import { useDevice, useEventLog, usePanelEventLog } from '~/hooks'
import { AutopilotSettings, Devices, Events, Home, Settings, Tools } from '~/pages'
import { DEVICES } from '~/panel'
import { watchSystemTheme } from '~/theme'
import styles from './App.module.css'

export default function App() {
  // The primary instance of each product is watched here (single owner) so the
  // connection state is shared by Home and Devices without the native HID bridge
  // ever opening the same device twice. Extra instances (module 2+) are watched
  // by their own Home cards.
  const autopilot = useEventLog()
  const approach = useDevice(DEVICES.approach)
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
            <Route path="/events" element={<Events autopilot={autopilot} panel={panel} />} />
            <Route path="/tools" element={<Tools buttons={autopilot.buttons} />} />
            <Route path="/autopilot/settings" element={<AutopilotSettings />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
