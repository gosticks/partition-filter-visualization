<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';

	onMount(() => {
		// On page load or when changing themes, best to add inline in `head` to avoid FOUC
		if (
			localStorage.theme === 'dark' ||
			(!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
		) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}

		// Whenever the user explicitly chooses light mode
		localStorage.theme = 'light';
	});
</script>

<div class="min-h-screen relative isolate max-h-screen max-w-full">
	<main>
		<slot />
	</main>
</div>
