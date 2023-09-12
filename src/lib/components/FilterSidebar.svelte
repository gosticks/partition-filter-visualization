<script lang="ts">
	import { dataStore } from '$lib/store/dataStore/DataStore';
	import filterStore, { type IFilterStoreGraphOptions } from '$lib/store/filterStore/FilterStore';
	import { onMount } from 'svelte';
	import Button from './Button.svelte';
	import Card from './Card.svelte';
	import DropdownSelect from './DropdownSelect.svelte';
	import { get } from 'svelte/store';
	import Slider from './Slider.svelte';
	import { GraphType } from '$lib/store/filterStore/types';

	let filterOptions: Record<string, unknown> = {};

	const sliderDisplay = (filterName: string) => {
		switch (filterName) {
			case 'size':
				return (value: number) => `${(value / 1024 / 1024).toFixed(3)} MB`;
			default:
				return (value: number) => `${value}`;
		}
	};

	const applyFilter = () => {
		console.log('Applying filter', filterOptions);
		// TODO: validate filter options

		filterStore.setGraphOptions(filterOptions);
	};

	onMount(async () => {
		// load initial options from store
		const values = get(filterStore);

		// If present load initial values
		if (values.graphOptions) {
			console.log('!!!Loading initial filter options', values.graphOptions);
			filterOptions = values.graphOptions.getCurrentOptions();
		}

		filterStore.subscribe((value) => {
			console.log('Values updated');
			if (value.graphOptions) {
				console.log('!!!Loading filter options', value.graphOptions.getCurrentOptions());
				filterOptions = { ...value.graphOptions.getCurrentOptions() };
			}
		});
	});

	const onInput = (value: number, label?: string) => {
		if (label) {
			filterOptions[label] = value;
		}
	};

	const optionConstructor = (value: string, index: number, meta: unknown) => ({
		label: value,
		value: value,
		id: index,
		initiallySelected: filterOptions[meta as string] === value
	});
</script>

<div class="absolute right-4 pt-4 t-0 bottom-0 w-96 min-h-full overflow-y-auto">
	<!-- <Card>Available preloaded tables {$filterStore.preloadedTables.length}</Card> -->
	{#if Object.keys($dataStore.tables).length > 0}
		<Card title="Filter Family">
			<p class="mb-4">
				Loaded tables: {Object.entries($dataStore.tables).reduce(
					(acc, [name, value]) => acc + ` ${name}`,
					''
				)}
			</p>
			<Button color="secondary" on:click={filterStore.reset}>Reset</Button>
		</Card>
		<Card title="Graph Type"
			><Button
				on:click={() => {
					filterStore.selectGraphType(GraphType.PLANE);
				}}>Plane mode</Button
			></Card
		>
		{#if $filterStore.graphOptions}
			<Card title="Visualization options">
				<div class="flex flex-col gap-2">
					<!-- {#if typeof $dataStore.combinedSchema['mode'] !== 'undefined'}
				<DropdownSelect
					label="Groupings"
					singular
					onSelect={(selected) => {
						filterOptions['mode'] = selected.length > 0 ? selected[0] : undefined;
					}}
					options={$dataStore.combinedSchema['mode'].options.map((entry) => ({
						label: entry,
						value: entry
					}))}
				/>
			{/if} -->
					{#each Object.entries($filterStore.graphOptions.filterOptions) as [key, value]}
						{#if value?.type === 'string'}
							<DropdownSelect
								label={value.label || key}
								singular
								onSelect={(selected) => {
									if (selected.length > 0) {
										filterOptions[key] = selected[0].value;
									} else {
										delete filterOptions[key];
									}
								}}
								meta={key}
								values={value.options}
								{optionConstructor}
							/>
						{:else if value?.type === 'number'}
							<Slider
								label={key}
								initialValue={filterOptions[key]}
								value={filterOptions[key]}
								min={Math.min(...value.options)}
								max={Math.max(...value.options)}
								diplayFunction={sliderDisplay(key)}
								{onInput}
							/>
						{/if}
					{/each}
					<!--
					<DropdownSelect
						label={`${axis} Axis`}
						singular
						selected={$filterStore.graphOptions?.options[axis] !== undefined
							? [$filterStore.graphOptions?.options[axis]]
							: undefined}
						onSelect={(selected) => {
							setAxisOptions(axis, selected.length > 0 ? selected[0] : undefined);
						}}
						options={Object.entries($dataStore.combinedSchema)
							.filter(([_, value]) => value === 'number')
							.map(([key]) => ({
								label: key,
								value: key
							}))}
					/>
				{/each} -->
					<Button color="primary" size="lg" on:click={applyFilter}>Visualize</Button>
				</div>
			</Card>
		{/if}
		{#if $dataStore.combinedSchema}
			<!-- <Card title="Filters">
				<div class="flex flex-col gap-2 h-[300px] overflow-y-scroll">
					{#each Object.entries($dataStore.commonFilterOptions) as [filterName, filter], idx}
						<div>
							{#if filter.type === 'string'}
								<DropdownSelect
									label={filterName}
									onSelect={(selected) => {
										selectedFilterOptions[filterName] = {
											options: selected,
											type: filter.type
										};
									}}
									options={filter.options.map((entry) => ({
										label: entry,
										value: entry
									}))}
								/>
							{:else if filter.type === 'number'}
								<Slider
									label={filterName}
									min={Math.min(...filter.options)}
									max={Math.max(...filter.options)}
									diplayFunction={sliderDisplay(filterName)}
									onInput={(value) => {
										selectedFilterOptions[filterName] = {
											options: [value],
											type: filter.type
										};
									}}
								/>
							{/if}
						</div>
					{/each}
				</div>
			</Card> -->
		{/if}
	{/if}
</div>
