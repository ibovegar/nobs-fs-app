mod hid;
mod serial;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(hid::HidState::default())
    .invoke_handler(tauri::generate_handler![
      hid::hid_open,
      hid::hid_close,
      hid::hid_list,
      serial::panel_serial_present,
      serial::panel_serial_send
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      // Continuously enumerate the HID bus so the frontend can auto-detect
      // which Nobs modules are plugged in (emits `hid://devices` on change).
      hid::start_enumeration(app.handle().clone());
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
