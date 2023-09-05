<script lang="ts">
	import type { PageServerData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import DropdownSelect from '$lib/components/DropdownSelect.svelte';
	import BasicGraph from '$lib/components/BasicGraph.svelte';
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';
	import type { Vector2 } from 'three';
	import { dataStore } from '$lib/store/dataStore/DataStore';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import Card from '$lib/components/Card.svelte';
	import Dialog from '$lib/components/Dialog.svelte';
	import QueryEditor from '$lib/components/QueryEditor.svelte';
	import FilterSidebar from '$lib/components/FilterSidebar.svelte';
	import GridBackground from '$lib/components/GridBackground.svelte';
	import MessageCard from '$lib/components/MessageCard.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import filterStore, { type IFilterStoreGraphOptions } from '$lib/store/FilterStore';

	export let data: PageServerData;

	onMount(async () => {
		if (!browser) return;

		// Pass possible db options to the filter sidebar
		filterStore.setPreloadedTables(data.filters);

		// // Restore filter options from query parameters
		// const url = new URL(location.href);
		// const selectedTable = url.searchParams.get('table');
		// const filter = url.searchParams.get('filter');

		// if (selectedTable && data.filters[selectedTable]) {
		// 	console.log('Loading table', selectedTable);
		// 	await dataStore.loadEntries([data.filters[selectedTable]]);
		// }

		// if (filter) {
		// 	console.log('Loading filter', filter);
		// 	try {
		// 		const filterOptions = JSON.parse(atob(filter)) as IFilterStoreGraphOptions;
		// 		console.log('Loading filter options', filterOptions);
		// 		await filterStore.setGraphOptions(filterOptions);
		// 	} catch (error) {
		// 		console.error('Failed to load filter options', error);
		// 	}
		// }

		// console.log('Mounting graph page', data);
	});

	let hoverPosition: Vector2 | undefined = undefined;

	function filesDropped(files: FileList) {
		dataStore.loadEntriesFromFileList(files);
	}

	function onHover(position: Vector2, object?: THREE.Object3D) {
		hoverPosition = position;
	}
</script>

<div>
	<div class="relative">
		<div class="h-screen w-full">
			{#if $filterStore.filterRenderer}
				<div class="flex-grow flex-shrink">
					<BasicGraph
						data={$filterStore.filterRenderer.data}
						dataRenderer={$filterStore.filterRenderer.renderer}
						{onHover}
					/>
					{#if $filterStore.selectedPoint && hoverPosition}
						<div
							class="absolute pointer-events-none"
							style={`left: ${hoverPosition.x}px; top: ${hoverPosition.y}px;`}
						>
							<Card title="TEST">{$filterStore.selectedPoint.toArray()}</Card>
						</div>
					{/if}
				</div>
			{:else}
				<GridBackground />
			{/if}
			{#if Object.keys($dataStore.tables).length === 0}
				<div class="h-full w-full flex flex-col gap-10 justify-center items-center">
					<MessageCard>
						<h2 class="text-2xl font-bold mb-5">Please select filter family</h2>
						<p class="mb-2">from filter data provided by us</p>
						<DropdownSelect
							onSelect={(options) => {
								dataStore.loadEntries(options);
							}}
							options={$filterStore.preloadedTables}
						/>
						<div class="flex mt-5 mb-5 items-center justify-center">
							<div class="border-t dark:border-background-700 w-full" />
							<div class="mx-4 opacity-50">OR</div>
							<div class="border-t w-full dark:border-background-700" />
						</div>
						<p class="mb-2">your own dataset in CSV format</p>
						<DropZone onFileDropped={filesDropped} />
					</MessageCard>
				</div>
			{/if}
		</div>
		<FilterSidebar />
		<div class="fixed bottom-5 left-5">
			<Dialog large>
				<Button slot="trigger" color="secondary" size="lg">SQL Editor</Button>
				<svelte:fragment slot="title">SQL Query Editor</svelte:fragment>
				<QueryEditor />
			</Dialog>
		</div>
		<!-- <div class="absolute right-4 pt-4 t-0 bottom-0 w-96 min-h-screen overflow-y-auto">
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
						<DropdownSelect
							label={'Y Axis'}
							singular
							onSelect={(selected) => {
								console.log(selected);
								yAxisKey = selected.length > 0 ? selected[0] : undefined;
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
		</div> -->
		{#if $filterStore.isLoading || $dataStore.isLoading}
			<LoadingOverlay isLoading={true} />
		{/if}
	</div>
</div>
