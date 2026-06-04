import { Route, Routes } from 'react-router'
import { Header, Sidebar } from '~/components'
import { useEventLog, useGamepad } from '~/hooks'
import { Devices, Events, Home, Settings } from '~/pages'
import { DEVICES } from '~/panel'
import styles from './App.module.css'

export default function App() {
  const autopilot = useEventLog()
  const approach = useGamepad(DEVICES.approach)
  const panel = useGamepad(DEVICES.panel)

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
            <Route path="/devices" element={<Devices />} />
            <Route path="/events" element={<Events autopilot={autopilot} />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
