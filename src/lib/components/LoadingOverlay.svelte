<script lang="ts">
	import { fade } from 'svelte/transition';

	export let isLoading: boolean = false;
</script>

<div
	class="fixed isolate inset-0 flex items-center justify-center backdrop-blur-sm z-50"
	class:visible={isLoading}
	transition:fade
>
	<div class="fixed inset-0 bg-gray-800 dark:bg-gray-950 opacity-75" />
	<div
		class="bg-white dark:bg-background-900 text-gray-500 dark:text-gray-100 rounded-lg p-4 z-20 shadow-lg"
	>
		<div class="flex items-center mb-4">
			<svg
				class="animate-spin mr-2 h-5 w-5 text-gray-700 dark:text-gray-200"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				/>
			</svg>
			<span>Loading...</span>
		</div>
		<p>Please wait while the content is being loaded.</p>
	</div>
</div>

<style>
	.visible {
		display: flex;
	}
</style>
