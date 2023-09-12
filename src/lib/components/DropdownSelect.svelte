<script lang="ts">
	import { beforeUpdate } from 'svelte';

	import { CheckCircleIcon, CheckIcon, MailIcon, PhoneIcon } from 'svelte-feather-icons';
	import Dropdown from './Dropdown.svelte';
	import Button from './Button.svelte';

	export let isOpen = false;
	export let singular = false;
	export let disabled = false;
	export let label: string | undefined = undefined;

	// Data type

	type T = $$Generic;
	type R = $$Generic;
	type M = $$Generic;
	type Option = { label: string; value: T; id: number; initiallySelected: boolean };

	export let selection = new Set<T>();

	export let options: Option[] = [];
	export let meta: M | undefined = undefined;
	export let values: R[] | undefined = undefined;
	export let optionConstructor: (value: R, index: number, meta: unknown) => Option;

	let dummy = 0;

	// $: {
	// 	selectionLabel = labelForSelection(options.filter((o) => selection.has(o.value)));
	// }
	$: {
		if (values) {
			options = values.map((v, i) => optionConstructor(v, i, meta));

			// Set all items that were initially selected
			selection = new Set<T>(options.filter((o) => o.initiallySelected).map((o) => o.value));
			const selectedOptions = options.filter((o) => selection.has(o.value));
			const newLabel = labelForSelection(selectedOptions);
			console.log('Selection', selection, selectedOptions, newLabel);
			if (newLabel !== selectionLabel) {
				selectionLabel = newLabel;
			}
		}
	}

	// add on select action
	export let onSelect: (selected: Option[]) => void | undefined;

	let selectionLabel = labelForSelection(options.filter((o) => selection.has(o.value)));

	function internalOnSelect(option: Option) {
		if (singular) {
			selection = new Set<T>([option.value]);
			onSelect?.([option]);

			return;
		}

		if (selection.has(option.value)) {
			selection.delete(option.value);
		} else {
			selection.add(option.value);
		}
		selection = new Set<T>(selection);

		const selectedOptions = options.filter((o) => selection.has(o.value));
		selectionLabel = labelForSelection(selectedOptions);

		onSelect?.(selectedOptions);
	}

	function clearAll() {
		selection = new Set<T>();
		onSelect?.([]);
	}

	function selectAll() {
		selection = new Set<T>(options.map((o) => o.value));
		onSelect?.(options);
	}

	// Computes the button text based on current selection
	function labelForSelection(selected: Option[]) {
		console.log('Label for selection', label, selected, selected.length);
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
	{#if label !== undefined}<div
			class="font-bold text-sm px-4 pb-1 text-secondary-500 dark:text-secondary-400"
		>
			{label}
		</div>{/if}
	<Dropdown buttonClass="w-full" {isOpen} disabled={!(options && options.length > 0) || disabled}>
		<span slot="button">
			{#if $$slots.default}
				<slot />
			{:else}
				<span class="text-sm">{selectionLabel}</span>
			{/if}
		</span>

		<div slot="content">
			<ul>
				{#each options as option, i}
					{@const selected = selection.has(option.value)}
					<li class="border-spacing-1 border-b dark:border-background-800 last:border-b-0">
						<button
							on:click={() => internalOnSelect(option)}
							class="p-4 hover:bg-secondary-200 dark:hover:bg-secondary-700 w-full text-left flex gap-4"
						>
							<div class="w-6">
								{#if singular}
									<div
										class="rounded-full op w-6 h-6 border-2 flex items-center justify-center border-secondary-900 {selected
											? 'opacity-100'
											: 'opacity-20'}"
									>
										<div hidden={!selected} class="rounded-full w-4 h-4 bg-secondary-900" />
									</div>
								{:else}
									<i hidden={!selected}><CheckIcon /></i>
								{/if}
							</div>
							<span class={selected ? 'font-bold' : ''}>{option.label}</span></button
						>
					</li>
				{/each}
			</ul>
			{#if !singular}
				<div class="border-t p-4 flex justify-end gap-2">
					<Button size="sm" color="primary" on:click={selectAll}>Select all</Button>
					<Button size="sm" on:click={clearAll}>Clear</Button>
				</div>
			{/if}
		</div>
	</Dropdown>
</div>
