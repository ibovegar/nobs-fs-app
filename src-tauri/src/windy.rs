// ── Native Windy serial link ─────────────────────────────────────────────────
// Windy (Arduino Uno Rev3 + Motor Shield) has no HID interface, so unlike the
// gamepad panels there is nothing for `hid.rs` to read: its serial port carries
// both directions. That also makes it different from `serial.rs`, the autopilot's
// write-only config channel that opens and closes per call — here the port must
// stay open so the device's unsolicited `STATE:` pushes (someone pressed a
// physical button) actually reach us.
//
//   command  windy_open(vid, pid) / windy_close() / windy_send(line)
//   event    "windy://line"        { line }                on each line received
//   event    "windy://connection"  { connected }           on plug / unplug
//
// One worker thread owns the port: it opens it, reads until it stops or unplugs,
// and reconnects automatically while the watcher is active. It publishes a
// `try_clone`d write handle so `windy_send` can write without stealing the read.

use std::io::{ErrorKind, Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use serde::Serialize;
use serialport::SerialPort;
use tauri::{AppHandle, Emitter, State};

use crate::serial::find_port;

/// Opening the port asserts DTR, which pulls the Uno's auto-reset line: the board
/// drops into its bootloader and is not running the sketch again for roughly two
/// seconds. Writes before that are lost, and the board emits boot noise, so the
/// watcher waits this out before reporting the link up.
const UNO_RESET: Duration = Duration::from_millis(2000);

/// Read timeout. Expires constantly (the device is silent unless something
/// changes) and is simply the polling interval for the stop flag.
const READ_TIMEOUT: Duration = Duration::from_millis(100);

const RECONNECT_DELAY: Duration = Duration::from_millis(500);

#[derive(Clone, Serialize)]
struct LinePayload {
    line: String,
}

#[derive(Clone, Serialize)]
struct ConnectionPayload {
    connected: bool,
}

/// Stop flag for the active watcher thread, plus the write handle it publishes.
#[derive(Default)]
pub struct WindyState {
    stop: Mutex<Option<Arc<AtomicBool>>>,
    writer: Arc<Mutex<Option<Box<dyn SerialPort>>>>,
}

#[tauri::command]
pub fn windy_open(app: AppHandle, state: State<WindyState>, vid: u16, pid: u16) {
    let mut slot = state.stop.lock().unwrap();
    if slot.is_some() {
        return; // already watching
    }
    let stop = Arc::new(AtomicBool::new(false));
    *slot = Some(stop.clone());
    drop(slot);

    let writer = state.writer.clone();
    thread::spawn(move || watch(app, vid, pid, stop, writer));
}

#[tauri::command]
pub fn windy_close(state: State<WindyState>) {
    if let Some(stop) = state.stop.lock().unwrap().take() {
        stop.store(true, Ordering::Relaxed);
    }
}

#[tauri::command]
pub fn windy_send(state: State<WindyState>, line: String) -> Result<(), String> {
    let mut guard = state.writer.lock().unwrap();
    let port = guard.as_mut().ok_or_else(|| "windy link is not open".to_string())?;
    port.write_all(line.as_bytes()).map_err(|e| format!("write: {e}"))?;
    port.flush().map_err(|e| format!("flush: {e}"))?;
    Ok(())
}

fn watch(
    app: AppHandle,
    vid: u16,
    pid: u16,
    stop: Arc<AtomicBool>,
    writer: Arc<Mutex<Option<Box<dyn SerialPort>>>>,
) {
    while !stop.load(Ordering::Relaxed) {
        // Re-resolve the port name on every attempt so a replug is picked up (the
        // OS can hand the board a different COM port after a reconnect).
        let opened = find_port(vid, pid).and_then(|name| {
            serialport::new(&name, 115200).timeout(READ_TIMEOUT).open().ok()
        });

        let Some(mut port) = opened else {
            thread::sleep(RECONNECT_DELAY);
            continue;
        };

        thread::sleep(UNO_RESET); // wait out the DTR-triggered board reset
        if stop.load(Ordering::Relaxed) {
            break;
        }

        if let Ok(handle) = port.try_clone() {
            *writer.lock().unwrap() = Some(handle);
        }
        let _ = app.emit("windy://connection", ConnectionPayload { connected: true });

        read_lines(&app, &mut port, &stop);

        *writer.lock().unwrap() = None;
        let _ = app.emit("windy://connection", ConnectionPayload { connected: false });
    }

    *writer.lock().unwrap() = None;
}

/// Read until the device goes away or the watcher is stopped, emitting one event
/// per `\n`-terminated line. The protocol is ASCII, so decoding each chunk
/// independently is safe — no multi-byte character can straddle a read boundary.
fn read_lines(app: &AppHandle, port: &mut Box<dyn SerialPort>, stop: &Arc<AtomicBool>) {
    let mut acc = String::new();
    let mut buf = [0u8; 256];

    loop {
        if stop.load(Ordering::Relaxed) {
            return;
        }
        match port.read(&mut buf) {
            Ok(0) => return, // port closed
            Ok(n) => {
                acc.push_str(&String::from_utf8_lossy(&buf[..n]));
                // A read can deliver several lines at once, or half of one — only
                // complete lines are emitted; the tail stays buffered.
                while let Some(i) = acc.find('\n') {
                    let line: String = acc.drain(..=i).collect();
                    let line = line.trim().to_string();
                    if !line.is_empty() {
                        let _ = app.emit("windy://line", LinePayload { line });
                    }
                }
            }
            Err(e) if e.kind() == ErrorKind::TimedOut => {} // silent device, keep polling
            Err(_) => return,                               // unplugged
        }
    }
}
