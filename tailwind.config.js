const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		fontFamily: {
			display: ['Source Serif Pro', 'Georgia', 'serif'],
			body: ['Manrope', 'system-ui', 'sans-serif']
		},

		extend: {
			colors: {
				primary: colors.blue,
				secondary: colors.gray,
				accent: colors.orange
			}
		}
	},
	plugins: []
};
