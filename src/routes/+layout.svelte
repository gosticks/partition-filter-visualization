<script lang="ts">
	import { onMount } from 'svelte';
	import '@fontsource/inter';
	import '../app.css';
	import { Theme, settingsStore } from '$lib/store/SettingsStore';
	import notificationStore from '$lib/store/notificationStore';
	import Button from '$lib/components/button/Button.svelte';
	import { XIcon } from 'svelte-feather-icons';
	import { ButtonColor, ButtonSize, ButtonVariant } from '$lib/components/button/type';

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
	class="min-h-screen relative isolate max-h-screen max-w-full bg-slate-100 dark:bg-background-950 dark:text-slate-200"
>
	<div
		class="absolute bottom-5 flex flex-col gap-2 max-h-96 max-w-[400px] overflow-hidden right-5 z-50"
	>
		{#each $notificationStore as notification}
			<div class="px-3 py-2 bg-purple-600 rounded-lg max-w-full break-words">
				<div class="flex gap-1">
					<h3 class="font-bold line-clamp-1 break-all">{notification.message}</h3>
					<Button
						variant={ButtonVariant.LINK}
						on:click={() => notificationStore.removeNotification(notification.id)}
						size={ButtonSize.SM}
						color={ButtonColor.SECONDARY}><XIcon size={'16'} /></Button
					>
				</div>
				{#if notification.description} <p class="line-clamp-2">{notification.description}</p> {/if}
				{#if notification.callback} <button on:click={notification.callback}>More</button> {/if}
			</div>
		{/each}
	</div>

	<main>
		<slot />
	</main>
</div>
