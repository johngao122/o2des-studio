/**
 * Developer Mode Service
 *
 * Manages developer mode authentication and state persistence.
 * Dev mode disables syntax validation checking for testing purposes.
 */

import { DevModeState } from '../types/devMode';
import {
	DEV_MODE_PASSWORD,
	DEV_MODE_STORAGE_KEY,
} from '../lib/constants/devMode';

export class DevModeService {
	private static instance: DevModeService;

	private constructor() {}

	/**
	 * Get singleton instance of DevModeService
	 */
	static getInstance(): DevModeService {
		if (!DevModeService.instance) {
			DevModeService.instance = new DevModeService();
		}
		return DevModeService.instance;
	}

	/**
	 * Validate password for dev mode access
	 * @param input - Password input to validate
	 * @returns true if password is correct
	 */
	validatePassword(input: string): boolean {
		return input === DEV_MODE_PASSWORD;
	}

	/**
	 * Enable dev mode and persist to session storage
	 */
	enableDevMode(): void {
		const devModeState: DevModeState = {
			isEnabled: true,
			enabledAt: new Date().toISOString(),
		};

		try {
			if (typeof window !== 'undefined' && window.sessionStorage) {
				sessionStorage.setItem(
					DEV_MODE_STORAGE_KEY,
					JSON.stringify(devModeState)
				);
			}
		} catch (error) {
			console.error('[DevModeService] Failed to persist dev mode state:', error);
		}
	}

	/**
	 * Disable dev mode and clear from session storage
	 */
	disableDevMode(): void {
		try {
			if (typeof window !== 'undefined' && window.sessionStorage) {
				sessionStorage.removeItem(DEV_MODE_STORAGE_KEY);
			}
		} catch (error) {
			console.error('[DevModeService] Failed to clear dev mode state:', error);
		}
	}

	/**
	 * Check if dev mode is currently active
	 * @returns true if dev mode is enabled in current session
	 */
	isDevModeActive(): boolean {
		try {
			if (typeof window !== 'undefined' && window.sessionStorage) {
				const stored = sessionStorage.getItem(DEV_MODE_STORAGE_KEY);
				if (stored) {
					const state: DevModeState = JSON.parse(stored);
					return state.isEnabled;
				}
			}
		} catch (error) {
			console.error('[DevModeService] Failed to read dev mode state:', error);
		}
		return false;
	}

	/**
	 * Restore dev mode state from session storage
	 * Call on app initialization to restore state after page reload
	 * @returns DevModeState if found, null otherwise
	 */
	restoreDevModeState(): DevModeState | null {
		try {
			if (typeof window !== 'undefined' && window.sessionStorage) {
				const stored = sessionStorage.getItem(DEV_MODE_STORAGE_KEY);
				if (stored) {
					const state: DevModeState = JSON.parse(stored);
					if (state.isEnabled) {
						return state;
					}
				}
			}
		} catch (error) {
			console.error(
				'[DevModeService] Failed to restore dev mode state:',
				error
			);
		}
		return null;
	}
}
