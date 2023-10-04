<script lang="ts" context="module">
	export type Option<T> = { label: string; value: T; id?: number; initiallySelected?: boolean };
	export type GroupKey = string;
	export type GroupOptionOrderer<T> = (a: Option<T>, b: Option<T>) => number;
	export type GroupOptionConstructor<R, T> = (
		value: R,
		index: number,
		meta: unknown
	) => [GroupKey, Option<T>];
	export type GroupDropdownSelectionEvent<T> = CustomEvent<{
		selected: Record<GroupKey, Option<T>[]>;
		meta?: unknown;
	}>;
</script>

<script lang="ts">
	import { select } from 'd3';

	import { ButtonColor, ButtonSize } from './button/type';

	import Label from './base/Label.svelte';
	import { createEventDispatcher } from 'svelte';

	import { CheckIcon } from 'svelte-feather-icons';
	import Dropdown from './Dropdown.svelte';
	import Button from './button/Button.svelte';

	export let isOpen = false;
	export let required = false;
	export let singular = false;
	export let disabled = false;
	export let expand = true;
	export let label: string | undefined = undefined;

	// Data types

	// inner value of options
	type T = $$Generic;

	// type if items received by OptionConstructor
	type R = $$Generic;
	// type of meta info assigned to items
	type M = $$Generic;

	type Groups = Map<GroupKey, Option<T>[]>;

	interface $$RestProps {
		size?: ButtonSize;
	}
	interface $$Events {
		select: DropdownSelectionEvent<T>;
	}

	export let selection: Map<GroupKey, Set<T>> = new Map();

	export let optionOrderer: GroupOptionOrderer<T> | undefined = undefined;
	export let groups: Groups = new Map();
	export let meta: M | undefined = undefined;
	export let values: R[] | undefined = undefined;
	export let optionConstructor: GroupOptionConstructor<R, T> | undefined = undefined;

	const selectDispatch = createEventDispatcher();

	$: {
		selectionLabel = labelForSelection(selection);
	}
	$: {
		if (values && optionConstructor) {
			generateOptions(values, optionConstructor);
		}
	}

	$: {
		if (optionOrderer) {
			groups = sort(groups, optionOrderer);
		}
	}

	function sort(groups: Groups, optionOrderer: GroupOptionOrderer<T>): Groups {
		const newGroups = new Map();
		for (const [k, v] of groups.entries()) {
			newGroups.set(k, v.sort(optionOrderer));
		}

		return newGroups;
	}

	function generateOptions(values: R[], optionConstructor: GroupOptionConstructor<R, T>) {
		const newGroups: Groups = new Map();

		values.forEach((v, i) => {
			const [groupKey, option] = optionConstructor!(v, i, meta);

			let prevOptions = newGroups.get(groupKey);

			if (!prevOptions) {
				newGroups.set(groupKey, [option]);
				return;
			}

			newGroups.set(groupKey, [...prevOptions, option]);
		});

		groups = newGroups;

		if (optionOrderer) {
			groups = sort(groups, optionOrderer);
		}

		// Set all items that were initially selected

		selection = new Map();
		for (const [k, v] of groups) {
			const groupSelectionSet = new Set<T>();
			v.forEach((opt) => {
				if (opt.initiallySelected) {
					groupSelectionSet.add(opt.value);
				}
			});
			selection.set(k, groupSelectionSet);
		}

		const newLabel = labelForSelection(selection);
		if (newLabel !== selectionLabel) {
			selectionLabel = newLabel;
		}
	}

	let selectionLabel = labelForSelection(selection);

	function internalOnSelect(groupKey: string, option: Option<T>) {
		// In singular mode we only allow one selection
		if (singular) {
			const newSelection = new Map();
			const newGroupSelection = new Set();
			newSelection.set(groupKey, newGroupSelection);
			selection = newSelection;
			selectDispatch('select', { selected: { [groupKey]: [option] }, meta });
			return;
		}

		const groupSet = selection.get(groupKey);

		if (!groupSet) {
			selection = new Map(selection);
			return;
		}

		if (groupSet.has(option.value)) {
			groupSet.delete(option.value);
		} else {
			groupSet.add(option.value);
		}
		selection = new Map(selection);

		const selectedOptions: Record<GroupKey, Option<T>[]> = {};

		for (const [key, group] of selection.entries()) {
			if (group.size === 0) {
				continue;
			}

			selectedOptions[key] = [];
			for (const opt of group.entries()) {
				// FIXME: filter not updated correcrly
				// selectedOptions[key].push(groups.get(key, ))
			}
		}

		selectDispatch('select', {
			selected: selectedOptions,
			meta
		});
	}

	function clearAll() {
		selection = new Map();
		selectDispatch('select', {
			selected: [],
			meta
		});
	}

	function selectAll() {
		selection = new Map(groups);
		selectDispatch('select', {
			selected: selection,
			meta
		});
	}

	function numberOfItems(selected: typeof selection) {
		let counter = 0;
		for (const options of selected.values()) {
			counter += options.size;
		}

		return counter;
	}

	// Computes the button text based on current selection
	function labelForSelection(selected: typeof selection) {
		if (selected.size === 0) {
			return 'Select';
		}

		if (singular) {
			for (const key of selected.keys()) {
				for (const option of selected.get(key)!.values()) {
					return option ?? 'Select';
				}
			}
		}

		return `(${numberOfItems(selected)}) selected`;
	}
</script>

<div class="flex-col" class:flex={expand} class:inline-flex={!expand}>
	{#if label !== undefined}
		<Label>
			{label}{#if required}<sup class="text-red-700">*</sup>{/if}
		</Label>
	{/if}
	<Dropdown
		buttonClass={expand ? 'w-full' : undefined}
		{isOpen}
		disabled={!(groups && groups.size > 0) || disabled}
		{...$$restProps}
	>
		<span slot="button">
			{#if $$slots.default}
				<slot />
			{:else}
				<span class="text-sm" class:opacity-30={selection.size === 0}>{selectionLabel}</span>
			{/if}
		</span>

		<div slot="content">
			<ul>
				{#each groups.entries() as [groupKey, options], i}
					{#each options as option, j}
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
				{/each}
			</ul>
			{#if !singular}
				<div
					class="sticky bottom-0 left-0 right-0 border-t dark:border-t-background-700 bg-background-50 dark:bg-background-800 backdrop-blur-sm"
				>
					<div class="p-2 flex justify-end gap-2">
						<Button size={ButtonSize.SM} color={ButtonColor.PRIMARY} on:click={selectAll}
							>Select all</Button
						>
						<Button size={ButtonSize.SM} on:click={clearAll}>Clear</Button>
					</div>
				</div>
			{/if}
		</div>
	</Dropdown>
</div>
