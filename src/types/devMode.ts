/**
 * Developer Mode Type Definitions
 */

/**
 * Developer mode state interface
 */
export interface DevModeState {
	/** Whether developer mode is currently enabled */
	isEnabled: boolean;
	/** ISO timestamp of when dev mode was enabled (null if disabled) */
	enabledAt: string | null;
}
