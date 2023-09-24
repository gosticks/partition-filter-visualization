<script lang="ts">
	import Label from './base/Label.svelte';
	import { beforeUpdate } from 'svelte';

	import { CheckCircleIcon, CheckIcon, MailIcon, PhoneIcon } from 'svelte-feather-icons';
	import Dropdown from './Dropdown.svelte';
	import Button from './button/Button.svelte';

	export let isOpen = false;
	export let required = false;
	export let singular = false;
	export let disabled = false;
	export let label: string | undefined = undefined;

	// Data type

	type T = $$Generic;
	type R = $$Generic;
	type M = $$Generic;
	type Option = { label: string; value: T; id?: number; initiallySelected?: boolean };

	type OptionConstructor = (value: R, index: number, meta: unknown) => Option;

	export let selection = new Set<T>();

	export let optionOrderer: ((a: Option, b: Option) => number) | undefined = undefined;
	export let options: Option[] = [];
	export let meta: M | undefined = undefined;
	export let values: R[] | undefined = undefined;
	export let optionConstructor: OptionConstructor | undefined = undefined;

	$: {
		selectionLabel = labelForSelection(options.filter((o) => selection.has(o.value)));
	}
	$: {
		if (values && optionConstructor) {
			generateOptions(values, optionConstructor);
		}
	}

	$: {
		if (optionOrderer) {
			options = options.sort(optionOrderer);
		}
	}

	function generateOptions(values: R[], optionConstructor: OptionConstructor) {
		options = values.map((v, i) => optionConstructor!(v, i, meta));

		if (optionOrderer) {
			options = options.sort(optionOrderer);
		}

		// Set all items that were initially selected
		selection = new Set<T>(options.filter((o) => o.initiallySelected).map((o) => o.value));
		const selectedOptions = options.filter((o) => selection.has(o.value));
		const newLabel = labelForSelection(selectedOptions);
		if (newLabel !== selectionLabel) {
			selectionLabel = newLabel;
		}
	}

	// add on select action
	export let onSelect: (selected: Option[], meta?: unknown) => void | undefined;

	let selectionLabel = labelForSelection(options.filter((o) => selection.has(o.value)));

	function internalOnSelect(option: Option) {
		// In singular mode we only allow one selection
		if (singular) {
			selection = new Set<T>([option.value]);
			onSelect?.([option], meta);
			return;
		}

		if (selection.has(option.value)) {
			selection.delete(option.value);
		} else {
			selection.add(option.value);
		}
		selection = new Set<T>(selection);

		const selectedOptions = options.filter((o) => selection.has(o.value));

		onSelect?.(selectedOptions, meta);
	}

	function clearAll() {
		selection = new Set<T>();
		onSelect?.([], meta);
	}

	function selectAll() {
		selection = new Set<T>(options.map((o) => o.value));
		onSelect?.(options, meta);
	}

	// Computes the button text based on current selection
	function labelForSelection(selected: Option[]) {
		if (selected.length === 0) {
			return 'Select';
		}

		if (singular) {
			return selected[0].label || 'Select';
		}

		if (options.length === selected.length) {
			return 'All selected';
		}

		return `(${selected.length}) selected`;
	}
</script>

<div class="flex flex-col">
	{#if label !== undefined}
		<Label>
			{label}{#if required}<sup class="text-red-700">*</sup>{/if}
		</Label>
	{/if}
	<Dropdown buttonClass="w-full" {isOpen} disabled={!(options && options.length > 0) || disabled}>
		<span slot="button">
			{#if $$slots.default}
				<slot />
			{:else}
				<span class="text-sm" class:opacity-30={selection.size === 0}>{selectionLabel}</span>
			{/if}
		</span>

		<div slot="content">
			<ul>
				{#each options as option, i}
					{@const selected = selection.has(option.value)}
					<li class="border-spacing-1 border-b dark:border-background-900 last:border-b-0">
						<button
							on:click={() => internalOnSelect(option)}
							class="p-2 hover:bg-primary-100 dark:hover:bg-secondary-700 w-full text-left flex gap-2"
						>
							<div class="w-6 pt pb">
								{#if singular}
									<div
										class:border-foreground-500={!selected}
										class:border-primary-500={selected}
										class="rounded-full op w-6 h-6 border-2 flex items-center justify-center"
									>
										<div hidden={!selected} class="rounded-full w-3 h-3 bg-primary-500" />
									</div>
								{:else}
									<i hidden={!selected}><CheckIcon /></i>
								{/if}
							</div>
							<span class:font-bold={selected} class:opacity-60={!selected}>{option.label}</span
							></button
						>
					</li>
				{/each}
			</ul>
			{#if !singular}
				<div
					class="sticky bottom-0 left-0 right-0 border-t dark:border-t-background-700 bg-background-50 dark:bg-background-800 backdrop-blur-sm"
				>
					<div class="p-2 flex justify-end gap-2">
						<Button size="sm" color="primary" on:click={selectAll}>Select all</Button>
						<Button size="sm" on:click={clearAll}>Clear</Button>
					</div>
				</div>
			{/if}
		</div>
	</Dropdown>
</div>
