import type { DeviceConfig } from '~/panel'

/** Raw input from a device at one instant, independent of how it was obtained. */
export interface DeviceSnapshot {
  connected: boolean
  /** Per-button pressed state, indexed by HID button index. */
  pressed: boolean[]
}

export type SnapshotListener = (snapshot: DeviceSnapshot) => void

/**
 * A source of raw device input. This is the *only* environment-specific piece:
 * it turns a `DeviceConfig` into a stream of `DeviceSnapshot`s. All press
 * detection, counting, and event logging happens above this (`useDevice`),
 * identically for every driver — so web and native behave the same.
 */
export interface DeviceDriver {
  readonly name: string
  /**
   * Begin watching a device. Calls `onSnapshot` whenever the connection state
   * or any button changes. Returns an unsubscribe function.
   */
  watch(device: DeviceConfig, onSnapshot: SnapshotListener): () => void
}
