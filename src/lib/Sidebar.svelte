<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	let className: string | undefined = '';
	export { className as class };

	const theme = writable('light'); // Initial theme

	// Switch theme function
	function toggleTheme() {
		theme.update((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'));
	}

	onMount(() => {
		// Check for previously saved theme in local storage
		// const savedTheme = localStorage.getItem('theme');
		// if (savedTheme) {
		// 	theme.set(savedTheme);
		// }
	});

	$: {
		// Save the current theme to local storage
		// localStorage.setItem('theme', $theme);
	}
</script>

<div class="sidebar {className} {theme}">
	<div class="p-4">
		<!-- Sidebar content goes here -->
		<slot />

		<div class="flex items-center mt-4">
			<label for="themeToggle" class="flex items-center cursor-pointer">
				<span class="mr-2">Dark Mode</span>
				<input
					type="checkbox"
					id="themeToggle"
					class="hidden"
					on:change={toggleTheme}
					checked={$theme === 'dark'}
				/>
				<span class="relative inline-block w-10 h-6 transition bg-gray-300 rounded-full">
					<span
						class="absolute top-0 left-0 w-6 h-6 transition transform bg-white rounded-full shadow-md"
						style="transform: translateX({$theme === 'dark' ? 'calc(100% - 0.75rem)' : '0'})"
					/>
				</span>
				<span class="ml-2">Light Mode</span>
			</label>
		</div>
	</div>
</div>

<style>
	.sidebar {
		width: 200px;
		height: 100vh;
		transition: background-color 0.3s, color 0.3s;
	}

	.sidebar.light {
		background-color: #f0f0f0;
		color: #000000;
	}

	.sidebar.dark {
		background-color: #1e1e1e;
		color: #ffffff;
	}
</style>
