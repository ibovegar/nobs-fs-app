import { useEffect, useMemo, useState } from 'react'
import { Route, Routes } from 'react-router'
import {
  AuroraBackground,
  Header,
  markWelcomeSeen,
  Sidebar,
  Welcome,
  welcomeSeen,
} from '~/components'
import { useApproachEventLog, useEventLog, useInstances, usePanelEventLog, useWindy } from '~/hooks'
import {
  AutopilotSettings,
  DeviceSettings,
  Devices,
  Events,
  Home,
  Settings,
  Tools,
  WindySettings,
} from '~/pages'
import { type DeviceKind, deviceFor } from '~/panel'
import { watchSystemTheme } from '~/theme'
import styles from './App.module.css'

// The watched device for a product: its primary (lowest) instance, or null when
// no instance is present (native, nothing plugged in) so the watcher sits idle
// and the card stays hidden. The tracked count makes a lone unit show its bare
// product name (see deviceFor).
const primaryDevice = (kind: DeviceKind, list: number[]) =>
  list.length ? deviceFor(kind, list[0], list.length) : null

export default function App() {
  // The primary instance of each product is watched here (single owner) so the
  // connection state is shared by Home and Devices without the native HID bridge
  // ever opening the same device twice. The primary is the lowest tracked instance
  // (the list is sorted ascending), so swapping the instance-1 unit out promotes the
  // next one up. Memoised on the instance number so the HID subscription only
  // re-targets when the primary actually changes, not on every render. Extra
  // instances are watched by their own Home cards.
  const instances = useInstances()
  const autopilotDev = useMemo(
    () => primaryDevice('autopilot', instances.autopilot),
    [instances.autopilot],
  )
  const approachDev = useMemo(
    () => primaryDevice('approach', instances.approach),
    [instances.approach],
  )
  const panelDev = useMemo(() => primaryDevice('panel', instances.panel), [instances.panel])
  const autopilot = useEventLog(autopilotDev)
  const approach = useApproachEventLog(approachDev)
  const panel = usePanelEventLog(panelDev)
  // Windy is not on the HID bus at all — it's a serial link, and one that can only
  // be held open by a single owner — so it's watched here rather than per-card,
  // and there's no instance set behind it (see hooks/useWindy).
  const windy = useWindy()

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
              element={
                <Home autopilot={autopilot} approach={approach} panel={panel} windy={windy} />
              }
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
                  windy={windy}
                />
              }
            />
            <Route
              path="/events"
              element={
                <Events autopilot={autopilot} approach={approach} panel={panel} windy={windy} />
              }
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
            <Route path="/windy/settings" element={<WindySettings windy={windy} />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
