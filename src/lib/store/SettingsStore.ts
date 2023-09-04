import { get, writable } from 'svelte/store';

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

export const settingsStore = writable<AppSettings>(initialAppSettings);

export const updateTheme = (theme: Theme) => {
	settingsStore.update((settings) => {
		settings.theme = theme;
		return settings;
	});
};

export const toggleThemeMode = () => {
	const { theme } = get(settingsStore);
	updateTheme(theme === Theme.Dark ? Theme.Light : Theme.Dark);
};
