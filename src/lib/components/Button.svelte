<script lang="ts">
	import type { Action } from '@sveltejs/kit';

	export let size: 'sm' | 'md' | 'lg' = 'md';
	export let disabled: boolean = false;
	export let color: 'primary' | 'secondary' = 'secondary';

	let className: string | undefined = undefined;

	export { className as class };

	function classForSize() {
		switch (size) {
			case 'sm':
				return 'px-2.5 py-1.5 text-xs shadow-sm rounded-md';
			case 'md':
				return 'px-4 py-2 text-sm shadow-mg rounded-lg';
			case 'lg':
				return 'px-4 py-2 text-base shadow-lg rounded-xl';
		}
	}

	function classForColors(): string {
		switch (color) {
			case 'primary':
				return 'text-white bg-primary-600 hover:bg-primary-700 border-primary-700 hover:border-primary-700';
			case 'secondary':
				return 'text-secondary-600 dark:text-background-50 bg-white border-secondary-300 dark:border-background-950 dark:bg-background-900 hover:bg-gray-50 dark:hover:bg-background-800 dark:hover:border-background-900';
		}
	}

	function classForDisabledState(): string {
		if (disabled) {
			return 'cursor-not-allowed opacity-50 pointer-events-none';
		}
		return '';
	}
</script>

<button
	{disabled}
	on:click
	class:disabled
	class="inline-flex justify-between items-center border {classForColors()} {classForSize()}  font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 {className ??
		''}"
>
	<slot name="leading" />
	<slot />
	<slot name="trailing" />
</button>

<style>
	.disabled {
		@apply cursor-not-allowed opacity-30 pointer-events-none;
	}
</style>
