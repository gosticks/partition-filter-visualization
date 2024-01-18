<script lang="ts" context="module">
	export type SliderDisplayFunction = (v: number) => string;

	export interface SliderEventDetails {
		value: number;
		label?: string;
	}

	export type SliderChangeEvent = SliderEventDetails;
	export type SliderInputEvent = SliderEventDetails;
</script>

<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Label from '../base/Label.svelte';
	import Tag from '../base/Tag.svelte';
	import EditableText from '../EditableText.svelte';

	export let disabled: boolean = false;
	export let min: number = 0;
	export let max: number = 100;
	export let step: number = 1;
	export let label: string | undefined = undefined;
	export let displayFunction: SliderDisplayFunction = (v: number) => v + '';

	export let initialValue: number | undefined = undefined;
	export let value: number = initialValue ?? 0;

	const dispatch = createEventDispatcher<{
		change: SliderChangeEvent;
		input: SliderInputEvent;
		start: boolean;
	}>();

	let isChanging = false;

	// Execute in separate call to prevent infinite loop when label is set
	const _onInput = () => {
		if (!isChanging) {
			isChanging = true;
			dispatch('start', true);
		}

		dispatch('input', {
			value,
			label
		});
	};

	const _onChange = () => {
		isChanging = false;
		dispatch('change', {
			value,
			label
		});
	};

	// $: _onInput(value);
	$: value = initialValue ?? 0;

	$: value = Math.max(min, Math.min(max, value)); // Ensure value stays within the min-max range
</script>

<div class="slider">
	{#if label}<div class="flex justify-between items-center mb-2">
			<Label
				>{#if label !== undefined}{label}:
				{/if}
			</Label>
			<EditableText
				buttonWrap
				on:change={(evt) => {
					const v = parseInt(evt.detail.change);
					if (Number.isNaN(v)) {
						return;
					}
					value = Math.max(min, Math.min(max, v));
					_onChange();
				}}
				value={displayFunction(value)}
			/>
		</div>
	{/if}
	<div class="flex items-center gap-1">
		<Tag>{min}</Tag>
		<input
			{disabled}
			type="range"
			class="slider-input appearance-none w-full h-2 rounded border border-slate-300 bg-slate-200 dark:border-background-600 dark:bg-background-800 transition-opacity"
			bind:value
			{min}
			{max}
			{step}
			on:input={_onInput}
			on:change={_onChange}
		/>
		<Tag>{max}</Tag>
	</div>
</div>
