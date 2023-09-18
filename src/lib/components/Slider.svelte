<script lang="ts">
	import Label from './base/Label.svelte';
	import Tag from './base/Tag.svelte';
	type DisplayFunction = (v: number) => string;

	export let min: number = 0;
	export let max: number = 100;
	export let label: string | undefined = undefined;
	export let displayFunction: DisplayFunction = (v: number) => v + '';

	export let initialValue: number | undefined = undefined;
	export let value: number = initialValue ?? 0;

	export let onInput: (value: number, label?: string) => void | undefined;
	export let onChange: (value: number, label?: string) => void | undefined;

	// Execute in separate call to prevent infinite loop when label is set
	const _onInput = (newValue: number) => {
		onInput?.(newValue, label);
	};

	const _onChange = (e: Event) => {
		onChange?.(value, label);
	};

	// $: _onInput(value);
	$: value = initialValue ?? 0;

	$: value = Math.max(min, Math.min(max, value)); // Ensure value stays within the min-max range
</script>

<div class="slider mb-4 mt-2">
	<div class="flex justify-between align-center">
		<Label
			>{#if label !== undefined}{label}:
			{/if}
		</Label>
		<Tag>{displayFunction(value)}</Tag>
	</div>
	<input
		type="range"
		class="slider-input appearance-none w-full h-2 rounded border border-slate-300 bg-slate-200 dark:border-background-600 dark:bg-background-800 transition-opacity"
		bind:value
		{min}
		{max}
		on:change={_onChange}
		step="1"
	/>
</div>
