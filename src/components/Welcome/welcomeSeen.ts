// First-run welcome screen: persist whether the user has dismissed it so it
// only ever shows once per browser / install. Mirrors the localStorage pattern
// used by the theme manager (see ~/theme/themeMode).

const STORAGE_KEY = 'nobs.welcomeSeen'

/** True once the user has dismissed the welcome screen. */
export function welcomeSeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    // Private mode / storage disabled — treat as seen so we don't nag.
    return true
  }
}

/** Remember that the welcome screen has been dismissed. */
export function markWelcomeSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // Best effort — nothing to do if storage is unavailable.
  }
}
