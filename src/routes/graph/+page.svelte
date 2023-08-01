<script lang="ts">
	import type { PageServerData } from './$types';
	import type { DataEntry, EntryDefinition, FilterEntry } from './proxy+page.server';
	import Button from '$lib/components/Button.svelte';
	import DropdownSelect from '$lib/components/DropdownSelect.svelte';
	import BasicGraph from '$lib/components/BasicGraph.svelte';
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';
	import type { Vector2 } from 'three';
	import {
		getFiltersOptions,
		loadCSV,
		rewriteEntries,
		useDataStore,
		type FilterOptions,
		type TableSchema,
		getTableSchema
	} from '$lib/store/DataStore';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import Card from '$lib/components/Card.svelte';
	import Dialog from '$lib/components/Dialog.svelte';
	import { PlaneRenderer } from '$lib/rendering/PlaneRenderer';
	import type { GraphRenderer } from '$lib/rendering/GraphRenderer';
	import QueryEditor from '$lib/components/QueryEditor.svelte';
	import Dropdown from '$lib/components/Dropdown.svelte';
	import Slider from '$lib/components/Slider.svelte';

	export let isLoading = false;

	export let data: PageServerData;

	let filterOptions: FilterOptions | undefined = undefined;

	let selectedFilterOptions: FilterOptions = {};
	let tableSchema: TableSchema | undefined = undefined;
	let xAxisKey: string | undefined = undefined;
	let zAxisKey: string | undefined = undefined;
	// List of possible test sizes (e.g. 10, 100, 1000, 10000)

	let filterData: number[][][] = [
		[
			[3, 4, 5, 6],
			[3, 4, 15, 6],
			[3, 4, 8, 6],
			[3, 4, 5, 12]
		],
		[
			[4, 5, 6, 7],
			[4, 5, 20, 7],
			[4, 5, 6, 7],
			[4, 5, 6, 15]
		]
	];

	let dataRenderer: GraphRenderer | undefined = undefined;

	let db = useDataStore();
	onMount(() => {
		db.subscribe((v) => {
			console.log('Data store updated', v);
		});
		dataRenderer = new PlaneRenderer();

		console.log('Mounting graph page', data);
	});

	let hoverPosition: Vector2 | undefined = undefined;

	async function onFilterSelect(selected: FilterEntry[]) {
		isLoading = true;

		// Load all CSV files matching the selected filters
		// const loading = Promise.all(
		// 	selectedFilters.flatMap((filter) =>
		// 		filter.entries.map((entry) => {

		// 			const csvUrl = new URL(entry.dataUrl, location.href).href;
		// 			console.log({ csvUrl, filter, entry });
		// 			return loadCSV(csvUrl, filter.name);
		// 		})
		// 	)
		// );

		const items = [2, 3]; //, 3, 8, 9, 10, 11];
		for (const idx of items) {
			const href = new URL(data.filters['bloom'].entries[idx].dataUrl, location.href).href;
			try {
				await loadCSV(href, 'bloom');
			} catch (e) {
				console.error(`Failed to load CSV ${href}:`, e);
			}
		}
		try {
			await rewriteEntries('bloom');
			const filters = await getFiltersOptions('bloom');
			const schema = await getTableSchema('bloom');
			console.log('Filters:', filters);
			filterOptions = filters;
			tableSchema = schema;
		} catch (e) {
			console.error('Failed to rewrite bloom entries:', e);
		}

		isLoading = false;
	}

	async function onVisualize() {
		// Query data and translate it into something whe can query
		// getTiledData('bloom', xAxisKey!, zAxisKey!, 100).then((data) => {
		// 	console.log(data);
		// 	console.log(data[0]['fpr']);
		// });
	}

	const sliderDisplay = (filterName: string) => {
		switch (filterName) {
			case 'size':
				return (value: number) => `${(value / 1024 / 1024).toFixed(3)} MB`;
			default:
				return (value: number) => `${value}`;
		}
	};
</script>

<div>
	<div class="relative">
		<div class="lg:flex w-full">
			<div class="flex-grow flex-shrink">
				<div class="h-screen">
					<BasicGraph
						data={{ data: filterData, scaleY: 25 }}
						{dataRenderer}
						onHover={(obj, pos) => {
							// hoverPosition = pos;
						}}
					/>
				</div>
			</div>
		</div>
		<div class="absolute right-4 top-4 w-96">
			<Card title="Filter Family">
				<DropdownSelect
					onSelect={onFilterSelect}
					options={Object.entries(data.filters).map(([key, value]) => ({
						label: key,
						value: value
					}))}
				/>
			</Card>
			{#if filterOptions}
				<Card title="Filters">
					<div class="flex flex-col gap-2">
						{#if filterOptions}
							{#each Object.entries(filterOptions) as [filterName, filter], idx}
								<div>
									{#if filter.type === 'string'}
										<DropdownSelect
											label={filterName}
											onSelect={(selected) => {
												selectedFilterOptions[filterName] = {
													value: selected,
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
													value: [value],
													type: filter.type
												};
											}}
										/>
									{/if}
								</div>
							{/each}
						{/if}
					</div>
				</Card>
			{/if}
			{#if tableSchema}
				<Card title="Visualize">
					<div class="flex flex-col gap-2">
						<DropdownSelect
							label={'X Axis'}
							singular
							onSelect={(selected) => {
								console.log(selected);
								xAxisKey = selected.length > 0 ? selected[0] : undefined;
							}}
							options={Object.entries(tableSchema)
								.filter(([_, value]) => value === 'number')
								.map(([key]) => ({
									label: key,
									value: key
								}))}
						/>
						<DropdownSelect
							label={'Z Axis'}
							singular
							onSelect={(selected) => {
								console.log(selected);
								zAxisKey = selected.length > 0 ? selected[0] : undefined;
							}}
							options={Object.entries(tableSchema)
								.filter(([_, value]) => value === 'number')
								.map(([key]) => ({
									label: key,
									value: key
								}))}
						/>
					</div>
					<Button color="primary" size="lg" on:click={onVisualize}>Visualize</Button>
				</Card>
			{/if}
			<Card title="Dev Tools">
				<Dialog large>
					<Button slot="trigger" color="secondary" size="lg">SQL Editor</Button>
					<svelte:fragment slot="title">SQL Query Editor</svelte:fragment>
					<QueryEditor />
				</Dialog>
			</Card>
		</div>
		{#if hoverPosition}
			<div class="absolute border-t-2 mt-6" style="left: {hoverPosition.x}; top: {hoverPosition.y}">
				<h2>Hovering over {hoverPosition}</h2>
			</div>
		{/if}
		{#if isLoading}
			<LoadingOverlay isLoading={true} />
		{/if}
	</div>
</div>
