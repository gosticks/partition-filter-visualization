import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';

export enum Theme {
	Light = 'light',
	Dark = 'dark'
}

/**
 * Store for all application settings
 */
interface AppSettings {
	theme: Theme;
}

const initialAppSettings: AppSettings = {
	theme: Theme.Light
};

export const appSettingsStore: Writable<AppSettings> = writable(initialAppSettings);

export const updateTheme = (theme: Theme) => {
	appSettingsStore.update((settings) => {
		return { ...settings, theme };
	});
};

export const toggleThemeMode = () => {
	console.log('toggleThemeMode', appSettingsStore);
	updateTheme(appSettingsStore.theme === Theme.Dark ? Theme.Light : Theme.Dark);
};
