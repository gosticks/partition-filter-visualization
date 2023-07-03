<script lang="ts">
	import { CheckCircleIcon, CheckIcon, MailIcon, PhoneIcon } from 'svelte-feather-icons';
	import Dropdown from './Dropdown.svelte';
	import Button from './Button.svelte';

	export let isOpen = false;
	export let singular = false;
	export let disabled = false;
	export let label: string | undefined = undefined;

	// Data type
	type T = $$Generic;

	export let options: { label: string; value: T }[];

	export let selected: T[] = [];

	// add on select action
	export let onSelect: (selected: T[]) => void | undefined;

	let buttonText = labelForSelection();

	function internalOnSelect(value: T) {
		if (singular) {
			selected = [value];
			onSelect?.(selected);

			buttonText = labelForSelection();
			return;
		}

		if (selected.includes(value)) {
			selected = selected.filter((v) => v !== value);
		} else {
			selected = [...selected, value];
		}
		onSelect?.(selected);
		buttonText = labelForSelection();
	}

	function clearAll() {
		selected = [];
		onSelect?.(selected);
		buttonText = labelForSelection();
	}

	function selectAll() {
		selected = options.map((o) => o.value);
		onSelect?.(selected);
		buttonText = labelForSelection();
	}

	// Computes the button text based on current selection
	function labelForSelection() {
		if (selected.length === 0) {
			return 'Select';
		}

		if (singular) {
			return options.find((o) => o.value === selected[0])?.label || 'Select';
		}

		if (options.length === selected.length) {
			return 'All selected';
		}

		return `(${selected.length}) selected`;
	}
</script>

<div class="flex flex-col">
	{#if label !== undefined}<div class="font-bold text-sm px-4 pb-1 text-secondary-500">
			{label}
		</div>{/if}
	<Dropdown buttonClass="w-full" {isOpen} {disabled}>
		<span slot="button">
			{#if $$slots.default}
				<slot />
			{:else}
				<span class="text-sm">{buttonText}</span>
			{/if}
		</span>

		<div slot="content">
			<ul>
				{#each options as { label, value }, i}
					{@const isSelected = selected.includes(value)}
					<li class="border-spacing-1 border-b last:border-b-0">
						<button
							on:click={() => internalOnSelect(value)}
							class="p-4 hover:bg-secondary-200 w-full text-left flex gap-4"
						>
							<div class="w-6">
								{#if singular}
									<div
										class="rounded-full op w-6 h-6 border-2 flex items-center justify-center border-secondary-900 {isSelected
											? 'opacity-100'
											: 'opacity-20'}"
									>
										<div hidden={!isSelected} class="rounded-full w-4 h-4 bg-secondary-900" />
									</div>
								{:else}
									<i hidden={!isSelected}><CheckIcon /></i>
								{/if}
							</div>
							<span class={isSelected ? 'font-bold' : ''}>{label}</span></button
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
