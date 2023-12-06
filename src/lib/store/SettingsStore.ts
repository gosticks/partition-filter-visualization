import { get, writable } from 'svelte/store';
import { withLogMiddleware } from './logMiddleware';
import { browser } from '$app/environment';
import { colorBrewer, graphColors } from '$lib/rendering/colors';

export enum Theme {
	Light = 'light',
	Dark = 'dark'
}

/**
 * Store for all application settings
 */
interface AppSettings {
	theme: Theme;
	colors: ThemeColors;
}

export interface ThemeColors {
	surfaceColor: string;
	surfaceSecondaryColor: string;
	border: string;
	textColor: string;
	textSecondaryColor: string;
	selectionColor: string;
}

const lightColors: ThemeColors = {
	surfaceColor: 'rgb(209, 210, 211)',
	surfaceSecondaryColor: 'rgb(199, 200, 201)',
	border: '#aaaaaa',
	textColor: '#000000',
	textSecondaryColor: '#333333',
	selectionColor: 'rgb(253,174,97)'
};
const darkColors: ThemeColors = {
	surfaceColor: 'rgb(17, 24, 39)',
	surfaceSecondaryColor: 'rgb(27, 34, 49)',
	border: 'rgba(55, 60, 65)',
	textColor: '#ffffff',
	textSecondaryColor: '#cecece',
	selectionColor: 'rgb(255,174,97)'
};

const initialAppSettings: AppSettings = {
	theme: Theme.Light,
	colors: lightColors
};

const colorsForTheme = (theme: Theme): ThemeColors => {
	if (theme === Theme.Dark) {
		return darkColors;
	} else {
		return lightColors;
	}
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

		initialState = {
			...initialAppSettings,
			theme: initialTheme,
			colors: colorsForTheme(initialTheme)
		};
	}

	const store = withLogMiddleware(writable<AppSettings>(initialState), 'SettingsStore');

	const updateTheme = (theme: Theme) => {
		store.update((settings) => {
			settings.theme = theme;
			settings.colors = colorsForTheme(theme);
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
