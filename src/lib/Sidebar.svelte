<script lang="ts">
	import { onMount } from 'svelte';
	import settingsStore, { Theme } from '$lib/store/SettingsStore';

	let className: string | undefined = '';
	export { className as class };
</script>

<div class="sidebar {className} {$settingsStore.theme}">
	<div class="p-4">
		<div>
			<!-- Sidebar content goes here -->
			<slot />
		</div>

		<div class="flex items-center mt-4">
			<label for="themeToggle" class="flex items-center cursor-pointer">
				<span class="mr-2">Dark Mode</span>
				<input
					type="checkbox"
					id="themeToggle"
					class="hidden"
					on:change={settingsStore.toggleThemeMode}
				/>
				<span class="relative inline-block w-10 h-6 transition bg-gray-300 rounded-full">
					<span
						class="absolute top-0 left-0 w-6 h-6 transition transform bg-white rounded-full shadow-md"
						style="transform: translateX({$settingsStore.theme === Theme.Dark
							? 'calc(100% - 0.75rem)'
							: '0'})"
					/>
				</span>
				<span class="ml-2">Light Mode</span>
			</label>
		</div>
	</div>
</div>

<style>
	.sidebar {
		height: 100vh;
		overflow-y: scroll;
		transition:
			background-color 0.3s,
			color 0.3s;
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
