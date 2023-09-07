<script lang="ts">
	type DisplayFunction = (v: number) => string;

	export let min: number = 0;
	export let max: number = 100;
	export let label: string | undefined = undefined;
	export let diplayFunction: DisplayFunction = (v: number) => v + '';

	export let value: number = 0;

	export let onInput: (value: number, label?: string) => void | undefined;

	// Execute in separate call to prevent infinite loop when label is set
	const _onInput = (newValue: number) => {
		onInput?.(newValue, label);
	};

	$: _onInput(value);

	$: value = Math.max(min, Math.min(max, value)); // Ensure value stays within the min-max range
</script>

<div class="slider flex flex-col items-center">
	{#if label !== undefined}<div class="font-bold text-sm px-4 pb-1 text-secondary-500">
			{label}
		</div>{/if}
	<input
		type="range"
		class="slider-input appearance-none w-full h-2 rounded bg-gray-300 outline-none opacity-70 transition-opacity"
		bind:value
		{min}
		{max}
		step="1"
	/>
	<div class="slider-value mt-2">{diplayFunction(value)}</div>
</div>
