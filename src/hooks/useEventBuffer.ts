import { useCallback, useRef, useState } from 'react'
import type { LogEntry } from '~/components'

const MAX_LOG = 60

export interface EventBuffer {
  log: LogEntry[]
  addLog: (entry: Omit<LogEntry, 'key'>) => void
}

/**
 * A capped, newest-first log buffer shared by the per-device event-log hooks.
 * `source` namespaces the generated keys so logs from different devices can be
 * merged into one list without key collisions.
 */
export function useEventBuffer(source: string): EventBuffer {
  const [log, setLog] = useState<LogEntry[]>([])
  const seq = useRef(0)

  const addLog = useCallback(
    (entry: Omit<LogEntry, 'key'>) => {
      setLog((prev) => [{ ...entry, key: `${source}-${seq.current++}` }, ...prev].slice(0, MAX_LOG))
    },
    [source],
  )

  return { log, addLog }
}
