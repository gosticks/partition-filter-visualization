import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/kit/vite';

import tailwind from 'tailwindcss';
import autoprefixer from 'autoprefixer';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess({
		fallback: '404.html',
		postcss: {
			plugins: [tailwind, autoprefixer]
		}
	}),

	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter(),
		// Adapt paths for GitHub Pages
		paths: {
			base: process.argv.includes('dev') ? '' : '/partition-filter-visualization'
			//base: process.env.NODE_ENV === 'production' ? '/partition-filter-visualization' : ''
		},
		alias: {
			$lib: './src/lib',
			$routes: './src/routes'
		}
	}
};

export default config;
