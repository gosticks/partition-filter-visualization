<script lang="ts">
	import { onMount } from 'svelte';
	import '@fontsource/inter';
	import '../app.css';
	import settingsStore, { Theme } from '$lib/store/SettingsStore';
	import notificationStore, { NotificationType } from '$lib/store/notificationStore';
	import { browser } from '$app/environment';
	import Notification from '$lib/components/Notification.svelte';

	function setDarkMode(enabled: boolean) {
		if (enabled) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}
	onMount(() => {
		// No theme setup on server side
		if (!browser) {
			return;
		}

		// Monitor browser preference for dark mode
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
			const newColorScheme = e.matches ? Theme.Dark : Theme.Light;
			setDarkMode(newColorScheme === Theme.Dark);
			settingsStore.updateTheme(newColorScheme);
		});

		settingsStore.subscribe((store) => {
			setDarkMode(store.theme === Theme.Dark);
		});
	});
</script>

<div
	class="min-h-screen relative isolate max-h-screen max-w-full bg-white dark:bg-background-950 dark:text-slate-200"
>
	<div class="absolute top-5 flex flex-col gap-2 max-h-96 left-5 max-sm:right-5 md z-50">
		{#each $notificationStore as notification}
			<Notification {notification} />
		{/each}
	</div>
	<main>
		<slot />
	</main>
</div>
