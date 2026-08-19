import { useCallback, useEffect, useRef, useState } from 'react'
import type { LogEntry } from '~/components'
import {
  connectWindy,
  disconnectWindy,
  onWindyConnection,
  onWindyLine,
  reconnectWindy,
  sendWindy,
  windyError,
  windyNeedsGrant,
  windySupported,
} from '~/io'
import {
  clampWindyLevel,
  parseWindyLine,
  type WindyIdentity,
  type WindyState,
  windyCommand,
} from '~/panel'
import { useEventBuffer } from './useEventBuffer'

// Opening probe retry cadence — comfortably outlasts the Uno's ~2 s bootloader
// window without hammering the port.
const PROBE_INTERVAL_MS = 700
const PROBE_ATTEMPTS = 8

export interface WindyControl {
  isConnected: boolean
  /** Whether this environment can talk to Windy at all (web: Chromium only). */
  supported: boolean
  /** Whether a one-time port grant is still needed before the link can open. */
  needsGrant: boolean
  /** Latest state from the device, or null until it has reported one. */
  state: WindyState | null
  /** Stored logical id + name, or null until GET_ID has answered. */
  identity: WindyIdentity | null
  log: LogEntry[]
  /** Why the last connect attempt failed, or null. */
  error: string | null
  /** Prompt for the port grant and open the link (must run from a user gesture). */
  connect: () => Promise<void>
  /** Release the serial port so the Arduino IDE can flash the board. */
  disconnect: () => Promise<void>
  setPower: (on: boolean) => void
  setSpeed: (level: number) => void
  /** Store a new logical id + name (SET_ID). Resolves once the write is away. */
  setIdentity: (id: string, name: string) => Promise<boolean>
}

/**
 * The single owner of the Windy serial link. Unlike the HID products there is no
 * driver/snapshot layer to sit on: the device pushes `STATE:` lines both as
 * command replies and unprompted when someone presses a physical button, and
 * both are treated identically — whatever arrives last is the truth.
 *
 * Commands are applied optimistically so the UI responds immediately, then the
 * device's own reply overwrites that guess (it clamps out-of-range speeds and
 * owns the real state, so the reply is authoritative).
 *
 * Mount this **once** — a serial port can only be held open by one owner.
 */
export function useWindy(): WindyControl {
  const supported = windySupported()
  const [isConnected, setIsConnected] = useState(false)
  const [state, setState] = useState<WindyState | null>(null)
  const [identity, setIdentityState] = useState<WindyIdentity | null>(null)
  const [needsGrant, setNeedsGrant] = useState(windyNeedsGrant())
  const [error, setError] = useState<string | null>(null)
  const { log, addLog } = useEventBuffer('windy')

  // The last state we logged, so an unchanged STATE: (e.g. the echo of our own
  // command) doesn't add a duplicate row.
  const logged = useRef<WindyState | null>(null)
  // Whether the device has answered our opening questions yet. Read by the probe
  // loop below, which keeps asking until both have landed.
  const haveState = useRef(false)
  const haveIdentity = useRef(false)

  const apply = useCallback(
    (next: WindyState) => {
      haveState.current = true
      setState(next)
      const prev = logged.current
      if (prev && prev.power === next.power && prev.level === next.level) return
      logged.current = next
      if (!prev || prev.power !== next.power) {
        addLog({
          ts: Date.now(),
          text: `FAN    ${next.power === 'ON' ? 'ON' : 'OFF'}`,
          kind: next.power === 'ON' ? 'press' : 'release',
        })
      }
      if (prev && prev.level !== next.level) {
        addLog({
          ts: Date.now(),
          text: `SPEED    ${next.level > prev.level ? '▶' : '◀'}  LEVEL ${next.level}`,
          kind: next.level > prev.level ? 'cw' : 'ccw',
        })
      }
    },
    [addLog],
  )

  useEffect(() => {
    if (!supported) return

    const offLine = onWindyLine((line) => {
      const msg = parseWindyLine(line)
      if (!msg) return
      if (msg.type === 'state') apply(msg.state)
      else if (msg.type === 'identity') {
        haveIdentity.current = true
        setIdentityState(msg.identity)
      }
      // 'error' is the device echoing a line it didn't understand — a bug on our
      // side rather than something the user can act on, so it stays off the log.
    })

    const offConn = onWindyConnection((connected) => {
      setIsConnected(connected)
      if (connected) {
        setNeedsGrant(false)
      } else {
        setState(null)
        setIdentityState(null)
        logged.current = null
        haveState.current = false
        haveIdentity.current = false
      }
    })

    // Reopen a link that was already permitted; on web with no grant yet this is
    // a no-op and the UI offers a Connect button instead.
    void reconnectWindy()

    return () => {
      offLine()
      offConn()
    }
  }, [supported, apply])

  /**
   * Ask the device what it is, and keep asking until it answers.
   *
   * This has to retry. The firmware only prints `STATE:` when something actually
   * *changes* (see `setFanOn`/`setFanLevel` in the sketch), so a reply to this
   * probe is the only way the app ever learns the current state — and opening the
   * port pulls the Uno's auto-reset line, so a probe fired while the bootloader is
   * still running is simply gone. Asking once left the controls disabled forever
   * whenever that happened, with nothing on screen to explain why.
   */
  useEffect(() => {
    if (!isConnected) return

    const ask = () => {
      if (!haveState.current) void sendWindy(windyCommand.getState())
      if (!haveIdentity.current) void sendWindy(windyCommand.getId())
    }

    let attempts = 0
    ask()
    const timer = window.setInterval(() => {
      attempts++
      if ((haveState.current && haveIdentity.current) || attempts > PROBE_ATTEMPTS) {
        window.clearInterval(timer)
        return
      }
      ask()
    }, PROBE_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [isConnected])

  const connect = useCallback(async () => {
    setError(null)
    const ok = await connectWindy()
    if (ok) setNeedsGrant(false)
    else setError(windyError())
  }, [])

  const disconnect = useCallback(async () => {
    setError(null)
    await disconnectWindy()
    // The port is granted but no longer held, so offer Connect again rather than
    // leaving a card with nothing actionable on it.
    setNeedsGrant(windyNeedsGrant())
  }, [])

  // Optimistic local echo — replaced by the device's reply a moment later.
  const setPower = useCallback((on: boolean) => {
    setState((s) => (s ? { ...s, power: on ? 'ON' : 'OFF' } : s))
    void sendWindy(windyCommand.setPower(on))
  }, [])

  const setSpeed = useCallback((level: number) => {
    const next = clampWindyLevel(level)
    setState((s) => (s ? { ...s, level: next } : s))
    void sendWindy(windyCommand.setSpeed(next))
  }, [])

  const setIdentityCmd = useCallback(
    (id: string, name: string) => sendWindy(windyCommand.setId(id, name)),
    [],
  )

  return {
    isConnected,
    supported,
    needsGrant,
    state,
    identity,
    log,
    error,
    connect,
    disconnect,
    setPower,
    setSpeed,
    setIdentity: setIdentityCmd,
  }
}
