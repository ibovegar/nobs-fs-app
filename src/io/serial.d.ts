// Minimal Web Serial typings — not present in TypeScript's lib.dom. Only the
// surface this app uses (request/open a port and write to it) is declared here.

interface SerialPortInfo {
  usbVendorId?: number
  usbProductId?: number
}

interface SerialPortFilter {
  usbVendorId?: number
  usbProductId?: number
}

interface SerialPort {
  readonly writable: WritableStream<Uint8Array> | null
  readonly readable: ReadableStream<Uint8Array> | null
  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
  getInfo(): SerialPortInfo
}

interface Serial extends EventTarget {
  getPorts(): Promise<SerialPort[]>
  requestPort(options?: { filters?: SerialPortFilter[] }): Promise<SerialPort>
}

interface Navigator {
  readonly serial?: Serial
}
