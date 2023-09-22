import { get, writable } from 'svelte/store';
import { withLogMiddleware } from './logMiddleware';
import { browser } from '$app/environment';

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

const settingsStore = () => {
	let initialState: AppSettings = { ...initialAppSettings };

	if (browser) {
		let initialTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
			? Theme.Dark
			: Theme.Light;
		const storedTheme = sessionStorage.getItem('theme');
		if (storedTheme) {
			initialTheme = storedTheme === Theme.Dark ? Theme.Dark : Theme.Light;
		}

		initialState = { ...initialAppSettings, theme: initialTheme };
	}

	const store = withLogMiddleware(writable<AppSettings>(initialState), 'SettingsStore');

	const updateTheme = (theme: Theme) => {
		store.update((settings) => {
			settings.theme = theme;
			return settings;
		});

		sessionStorage.theme = theme;
	};

	const toggleThemeMode = () => {
		const { theme } = get(store);
		updateTheme(theme === Theme.Dark ? Theme.Light : Theme.Dark);
	};

	return {
		...store,
		updateTheme,
		toggleThemeMode
	};
};

export default settingsStore();
