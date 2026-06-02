import styles from './EventLog.module.css'

export interface LogEntry {
  key: number
  ts: number
  text: string
  kind: 'cw' | 'ccw' | 'press' | 'release'
}

const kindClass: Record<LogEntry['kind'], string> = {
  cw:      styles.rowCw,
  ccw:     styles.rowCcw,
  press:   styles.rowPress,
  release: styles.rowRelease,
}

function fmtTime(t: number) {
  const d = new Date(t)
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join(':') + '.' + String(d.getMilliseconds()).padStart(3, '0')
}

interface Props {
  log: LogEntry[]
  isConnected: boolean
}

export function EventLog({ log, isConnected }: Props) {
  if (log.length === 0) {
    return (
      <div className={styles.log}>
        <span className={styles.empty}>
          {isConnected
            ? 'Connected — press a button or turn an encoder'
            : 'Press any button or turn a knob to wake the browser HID connection'}
        </span>
      </div>
    )
  }

  return (
    <div className={styles.log}>
      {log.map(e => (
        <div key={e.key} className={`${styles.row} ${kindClass[e.kind]}`}>
          <span className={styles.ts}>{fmtTime(e.ts)}</span>
          <span className={styles.text}>{e.text}</span>
        </div>
      ))}
    </div>
  )
}
