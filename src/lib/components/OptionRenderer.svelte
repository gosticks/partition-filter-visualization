<script lang="ts">
	import Label from './base/Label.svelte';

	import type { SliderChangeEvent } from './slider/types';

	import Slider from './slider/Slider.svelte';

	import DropdownSelect from './DropdownSelect.svelte';

	import type { GraphFilterOption } from '$lib/store/filterStore/types';

	type T = $$Generic;
	export let key: keyof T;
	export let option: GraphFilterOption<T>;
	export let state: T | undefined = undefined;
	export let style: string | undefined = undefined;
	export let onValueChange: (key: keyof T, value?: T[keyof T]) => void;

	const keyAsString = key.toString();

	let disabled = option.type === 'number?' && option.default ? false : true;

	const onSliderChange = (evt: SliderChangeEvent) => {
		onValueChange(key, evt.detail.value as T[keyof T]);
	};

	const optionConstructor = (value: string, index: number, meta: unknown) => ({
		label: value,
		value: value,
		id: index,
		initiallySelected: state?.[meta as keyof T] === value
	});

	const onColorChange = (evt: Event) =>
		onValueChange(key, (evt.target as HTMLInputElement).value as T[keyof T]);

	const onOptionSelected = (
		evt: CustomEvent<{ selected: { label: string; value: string }[]; meta?: unknown }>
	) => {
		const { meta, selected } = evt.detail;
		const key = meta as keyof T;
		if (selected.length > 0) {
			onValueChange(key, selected[0].value as T[keyof T]);
		} else {
			onValueChange(key, undefined as T[keyof T]);
		}
	};

	const onOptionChanged = (evt: Event) => {
		onValueChange(key, (evt.currentTarget as HTMLInputElement).checked as T[keyof T]);
	};

	const onLinkedOptionChanged = (evt: Event) => {
		if (option.type === 'number?') {
			let checked = (evt.currentTarget as HTMLInputElement).checked;
			disabled = !checked;
			onValueChange(key, (checked ? option.default : undefined) as T[keyof T]);
		}
	};

	const sliderDisplay = (value: number) => {
		switch (key) {
			case 'size':
				return `${(value / 1024 / 1024).toFixed(3)} MB`;
			default:
				return `${value}`;
		}
	};
</script>

<div {style}>
	{#if option.type === 'string'}
		<DropdownSelect
			label={option.label || keyAsString}
			singular
			required={option.required}
			on:select={onOptionSelected}
			meta={key}
			values={option.options}
			{optionConstructor}
			optionOrderer={(a, b) => a.label.localeCompare(b.label)}
		/>
	{:else if option.type === 'number'}
		{@const min = Math.min(...option.options)}
		{@const max = Math.max(...option.options)}
		{@const initialValue = state?.[key] ?? min}
		<Slider
			label={option.label}
			{initialValue}
			{min}
			{max}
			step={option.step}
			displayFunction={sliderDisplay}
			on:change={onSliderChange}
		/>
	{:else if option.type === 'number?'}
		{@const min = Math.min(...option.options)}
		{@const max = Math.max(...option.options)}
		{@const initialValue = state?.[key] ?? min}
		<div>
			<Label>
				<div class="flex justify-between">
					<span>{option.toggleLabel}</span>
					<input
						class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
						type="checkbox"
						on:change={onLinkedOptionChanged}
					/>
				</div>
			</Label>
			{#if !disabled}
				<Slider
					{initialValue}
					{disabled}
					{min}
					{max}
					step={option.step}
					displayFunction={sliderDisplay}
					on:change={onSliderChange}
				/>
			{/if}
		</div>
	{:else if option.type === 'boolean'}
		<Label>
			<div class="flex justify-between">
				<span>{option.label}</span>
				<input
					class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
					type="checkbox"
					checked={option.default}
					on:change={onOptionChanged}
				/>
			</div>
		</Label>
	{:else if option.type === 'color'}
		<Label>
			<div class="flex justify-between">
				<span>{option.label}</span>
				<input
					type="color"
					value={option.default}
					on:input={onColorChange}
					on:change={onColorChange}
				/>
			</div>
		</Label>
	{:else if option.type === 'row'}
		<div class="flex justify-stretch gap-2">
			{#each option.items as item, index}
				<svelte:self
					{state}
					style="flex-shrink: 0; flex-grow: {option.grow?.[index] ?? 1};"
					{onValueChange}
					option={item}
					key={option.keys[index]}
				/>
			{/each}
		</div>
	{/if}
</div>
