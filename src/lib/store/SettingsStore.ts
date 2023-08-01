import { get } from 'svelte/store';
import { useWritable } from './utils';

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

export const useSettingsStore = () => useWritable('appSettings', initialAppSettings);

export const updateTheme = (theme: Theme) => {
	const store = useSettingsStore();
	store.update((settings) => {
		return { ...settings, theme };
	});
};

export const toggleThemeMode = () => {
	const store = useSettingsStore();
	const value = get(store);
	updateTheme(value.theme === Theme.Dark ? Theme.Light : Theme.Dark);
};
