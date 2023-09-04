<script lang="ts">
	import { dataStore } from '$lib/store/dataStore/DataStore';
	import filterStore, { GraphType, type IFilterStoreGraphOptions } from '$lib/store/FilterStore';
	import Button from './Button.svelte';
	import Card from './Card.svelte';
	import DropdownSelect from './DropdownSelect.svelte';

	let filterOptions: Partial<IFilterStoreGraphOptions['options']> = {};
	let graphType = GraphType.PLANE;

	const sliderDisplay = (filterName: string) => {
		switch (filterName) {
			case 'size':
				return (value: number) => `${(value / 1024 / 1024).toFixed(3)} MB`;
			default:
				return (value: number) => `${value}`;
		}
	};

	const applyFilter = () => {
		// TODO: validate filter options

		filterStore.setGraphOptions({
			type: graphType,
			options: filterOptions as any
		});
	};

	const setAxisOptions = (axis: 'x' | 'y' | 'z', option?: string) => {
		filterOptions[axis] = option;
	};
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
			<Button color="secondary" on:click={dataStore.resetDatabase}>Reset</Button>
		</Card>

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
			<Card title="Graph Type">Select a graph type here</Card>
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

					{#each ['x', 'y', 'z'] as axis}
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
					{/each}
					<Button color="primary" size="lg" on:click={applyFilter}>Visualize</Button>
				</div>
			</Card>
		{/if}
	{/if}
</div>
