/**
 * True when running inside the Tauri native shell rather than a web browser.
 * Tauri injects `__TAURI_INTERNALS__` on `window`; the web build never has it.
 * Used both to pick the input driver and to gate native-only UI (e.g. the
 * window close button in the frameless desktop window).
 */
export const isNative = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
