// ── Native HID bridge ────────────────────────────────────────────────────────
// Enumerates and reads the USB HID gamepad panels with the `hidapi` crate and
// pushes their input reports to the frontend. This is the Rust side the
// `nativeDriver` (src/io/nativeDriver.ts) expects:
//
//   command  hid_open(vid, pid)  / hid_close(vid, pid)
//   event    "hid://report"      { vid, pid, bytes }   on each input report
//   event    "hid://connection"  { vid, pid, connected } on plug / unplug
//
// One worker thread per (vid, pid) owns the device: it opens it, reads reports
// until it stops or unplugs, and reconnects automatically while the watcher is
// active. Report decoding is shared with the web driver (`decodeJoystickReport`).

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use hidapi::HidApi;
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

#[derive(Clone, Serialize)]
struct ReportPayload {
    vid: u16,
    pid: u16,
    bytes: Vec<u8>,
}

#[derive(Clone, Serialize)]
struct ConnectionPayload {
    vid: u16,
    pid: u16,
    connected: bool,
}

/// Per-(vid, pid) stop flags for the active watcher threads.
#[derive(Default)]
pub struct HidState {
    watchers: Mutex<HashMap<(u16, u16), Arc<AtomicBool>>>,
}

#[tauri::command]
pub fn hid_open(app: AppHandle, state: State<HidState>, vid: u16, pid: u16) {
    let mut watchers = state.watchers.lock().unwrap();
    if watchers.contains_key(&(vid, pid)) {
        return; // already watching this device
    }
    let stop = Arc::new(AtomicBool::new(false));
    watchers.insert((vid, pid), stop.clone());
    drop(watchers);

    thread::spawn(move || watch_device(app, vid, pid, stop));
}

#[tauri::command]
pub fn hid_close(state: State<HidState>, vid: u16, pid: u16) {
    if let Some(stop) = state.watchers.lock().unwrap().remove(&(vid, pid)) {
        stop.store(true, Ordering::Relaxed);
    }
}

fn watch_device(app: AppHandle, vid: u16, pid: u16, stop: Arc<AtomicBool>) {
    let mut connected = false;

    while !stop.load(Ordering::Relaxed) {
        // Re-enumerate on each (re)connection attempt so a replug is picked up.
        let api = match HidApi::new() {
            Ok(api) => api,
            Err(_) => {
                thread::sleep(Duration::from_millis(500));
                continue;
            }
        };

        match api.open(vid, pid) {
            Ok(device) => {
                connected = true;
                let _ = app.emit(
                    "hid://connection",
                    ConnectionPayload { vid, pid, connected: true },
                );
                // Flip the UI to "connected" right away; real buttons follow.
                let _ = app.emit("hid://report", ReportPayload { vid, pid, bytes: vec![] });

                let mut buf = [0u8; 64];
                loop {
                    if stop.load(Ordering::Relaxed) {
                        return;
                    }
                    match device.read_timeout(&mut buf, 100) {
                        Ok(0) => {} // timeout, no new report
                        Ok(n) => {
                            // Strip the leading HID report-ID byte so the payload
                            // matches WebHID's `inputreport` (which excludes it).
                            let bytes = buf[1..n].to_vec();
                            let _ = app.emit("hid://report", ReportPayload { vid, pid, bytes });
                        }
                        Err(_) => break, // read failed — treat as unplugged
                    }
                }
            }
            Err(_) => {
                thread::sleep(Duration::from_millis(500));
            }
        }

        if connected {
            connected = false;
            let _ = app.emit(
                "hid://connection",
                ConnectionPayload { vid, pid, connected: false },
            );
        }
    }
}
