/**
 * Developer Mode Constants
 *
 * Dev mode allows users to disable syntax validation checking for testing purposes.
 * Access is password-protected and persists only for the current session.
 */

/** Password required to enable developer mode */
export const DEV_MODE_PASSWORD = 'dev2025';

/** SessionStorage key for persisting dev mode state */
export const DEV_MODE_STORAGE_KEY = 'o2des_dev_mode';

/** Keyboard shortcut to open dev mode dialog */
export const DEV_MODE_SHORTCUT = 'Ctrl+Shift+E'; // Meta+Shift+E on Mac
export const DEV_MODE_SHORTCUT_MAC = 'Meta+Shift+E';
