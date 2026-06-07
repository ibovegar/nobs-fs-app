import { useEffect } from 'react'
import { Route, Routes } from 'react-router'
import { Header, Sidebar } from '~/components'
import { useDevice, useEventLog } from '~/hooks'
import { AutopilotSettings, Devices, Events, Home, Settings, Tools } from '~/pages'
import { DEVICES } from '~/panel'
import { watchSystemTheme } from '~/theme'
import styles from './App.module.css'

export default function App() {
  const autopilot = useEventLog()
  const approach = useDevice(DEVICES.approach)
  const panel = useDevice(DEVICES.panel)

  // Repaint live when the OS theme flips and the user is on 'system'.
  useEffect(() => watchSystemTheme(), [])

  return (
    <div className={styles.app}>
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
            <Route path="/events" element={<Events autopilot={autopilot} />} />
            <Route path="/tools" element={<Tools buttons={autopilot.buttons} />} />
            <Route path="/autopilot/settings" element={<AutopilotSettings />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
