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
				return 'px-2.5 py-1.5 text-xs';
			case 'md':
				return 'px-4 py-2 text-sm';
			case 'lg':
				return 'px-4 py-2 text-base';
		}
	}

	function classForColors(): string {
		switch (color) {
			case 'primary':
				return 'text-white bg-primary-600 hover:bg-primary-700 ';
			case 'secondary':
				return 'text-secondary-600 bg-white hover:bg-secondary-50 hover:bg-gray-50';
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
	class="inline-flex justify-between items-center {classForDisabledState()} {classForColors()} {classForSize()} border rounded-xl shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 {className ??
		''}"
>
	<slot name="leading" />
	<slot />
	<slot name="trailing" />
</button>
