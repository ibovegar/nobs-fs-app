/**
 * Decode a raw HID input report from the Arduino Joystick library into
 * per-button pressed flags.
 *
 * That library packs buttons as bits, LSB first (button `i` → byte `i >> 3`,
 * bit `i & 7`); this firmware has no axes, so the payload is just the button
 * bytes. `data` is the report with the report-ID byte already stripped — which
 * is what WebHID's `inputreport` event gives, and what the native bridge sends.
 * Bytes beyond the report length read as `false`, so a device exposing fewer
 * buttons than its `DeviceConfig` declares is handled gracefully.
 */
export function decodeJoystickReport(data: Uint8Array, buttonCount: number): boolean[] {
  return Array.from({ length: buttonCount }, (_, i) => {
    const byte = i >> 3
    return byte < data.length && ((data[byte] >> (i & 7)) & 1) === 1
  })
}
