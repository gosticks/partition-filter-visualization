<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { Theme, settingsStore } from '$lib/store/SettingsStore';

	function setDarkMode(enabled: boolean) {
		if (enabled) {
			document.documentElement.classList.add('dark');
			localStorage.theme = Theme.Dark;
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.theme = Theme.Light;
		}
	}

	onMount(() => {
		const initialDark =
			localStorage.theme === Theme.Dark ||
			window.matchMedia('(prefers-color-scheme: dark)').matches;
		setDarkMode(initialDark);
		$settingsStore.theme = initialDark ? Theme.Dark : Theme.Light;

		// Monitor browser preference for dark mode
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
			const newColorScheme = e.matches ? Theme.Dark : Theme.Light;
			$settingsStore.theme = newColorScheme;
			setDarkMode(newColorScheme === Theme.Dark);
		});
	});
</script>

<div
	class="min-h-screen relative isolate max-h-screen max-w-full bg-slate-100 dark:bg-background-950"
>
	<main class="dark:text-slate-200">
		<slot />
	</main>
</div>
