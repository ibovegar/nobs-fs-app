import type { DeviceConfig } from '~/panel'
import type { DeviceDriver, SnapshotListener } from './types'

// Web / development driver. The Gamepad API only exposes a device after the user
// actuates it (browser anti-fingerprinting), so detection here requires turning
// a knob or pressing a button once. The native driver avoids that.
export const gamepadDriver: DeviceDriver = {
  name: 'gamepad',

  watch(device: DeviceConfig, onSnapshot: SnapshotListener) {
    let raf = 0

    const poll = () => {
      const gamepads = navigator.getGamepads?.() ?? []
      const gp =
        Array.from(gamepads).find((g) => g?.id.includes(device.vid) && g.id.includes(device.pid)) ??
        null

      if (gp) {
        const pressed = Array.from({ length: device.buttonCount }, (_, i) =>
          i < gp.buttons.length ? gp.buttons[i].pressed : false,
        )
        onSnapshot({ connected: true, pressed })
      } else {
        onSnapshot({ connected: false, pressed: [] })
      }

      raf = requestAnimationFrame(poll)
    }

    raf = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(raf)
  },
}
