// ── Native serial config channel ─────────────────────────────────────────────
// WebView2 has no Web Serial API, so the native build configures the panel from
// Rust instead. The frontend's `configNative` calls these commands; the panel's
// firmware reads "A<n>\n" lines on its USB CDC port (see docs/mapping.md).
//
//   panel_serial_present(vid, pid) -> bool      is a matching CDC port plugged in?
//   panel_serial_send(vid, pid, line) -> Result  write one line to that port
//
// We open/write/close per call (config writes are rare). 115200 baud is nominal
// for CDC and, unlike a 1200-baud touch, does not reset the Micro.
//
// The Micro's USB-CDC is not ready to receive the instant the host opens the port:
// the device side needs a few ms after the open before its OUT endpoint accepts
// data. Because we open per call, *every* write is a "first write after open", so
// without a settle delay every line is silently dropped and the panel never sees
// the config. OPEN_SETTLE bridges that gap (one-shot; config writes are rare and
// already debounced ~200 ms, so the added latency is irrelevant).

use std::io::Write;
use std::thread::sleep;
use std::time::Duration;

use serialport::SerialPortType;

const OPEN_SETTLE: Duration = Duration::from_millis(150);

/// Find the serial port name for a USB device matching `vid`/`pid`.
/// Shared with `windy.rs`, which keeps a port open rather than writing per call.
pub fn find_port(vid: u16, pid: u16) -> Option<String> {
    serialport::available_ports().ok()?.into_iter().find_map(|p| match p.port_type {
        SerialPortType::UsbPort(info) if info.vid == vid && info.pid == pid => Some(p.port_name),
        _ => None,
    })
}

#[tauri::command]
pub fn panel_serial_present(vid: u16, pid: u16) -> bool {
    find_port(vid, pid).is_some()
}

#[tauri::command]
pub fn panel_serial_send(vid: u16, pid: u16, line: String) -> Result<(), String> {
    let name = find_port(vid, pid).ok_or_else(|| "panel serial port not found".to_string())?;
    let mut port = serialport::new(&name, 115200)
        .timeout(Duration::from_millis(500))
        .open()
        .map_err(|e| format!("open {name}: {e}"))?;
    sleep(OPEN_SETTLE); // let the Micro's CDC OUT endpoint come up before writing
    port.write_all(line.as_bytes()).map_err(|e| format!("write {name}: {e}"))?;
    port.flush().map_err(|e| format!("flush {name}: {e}"))?;
    Ok(())
}
