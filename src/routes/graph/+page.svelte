<script lang="ts">
	import type { PageServerData } from './$types';
	import BasicGraph from '$lib/components/BasicGraph.svelte';
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';
	import type { Vector2 } from 'three';
	import { dataStore } from '$lib/store/dataStore/DataStore';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import FilterSidebar from '$lib/components/FilterSidebar.svelte';
	import GridBackground from '$lib/components/GridBackground.svelte';
	import MessageCard from '$lib/components/MessageCard.svelte';
	import filterStore, { type IFilterStoreGraphOptions } from '$lib/store/filterStore/FilterStore';
	import Minimal from '$lib/components/graph/Minimal.svelte';
	import PlaneGraph from '$lib/components/graph/PlaneGraph.svelte';
	import { PlaneGraphOptions } from '$lib/store/filterStore/graphs/plane';
	import TableSelection from '$lib/components/tableSelection/TableSelection.svelte';
	import type { TableSelectionEvent } from '$lib/components/tableSelection/types';

	export let data: PageServerData;

	onMount(async () => {
		if (!browser) return;

		// Pass possible db options to the filter sidebar
		await filterStore.initWithPreloadedTables(data.filters);
	});

	function onTableSelected(evt: TableSelectionEvent) {
		const { buildInTables, externalTables } = evt.detail;
		if (buildInTables) {
			filterStore.selectBuildInTables(buildInTables.map((option) => option.value));
		}

		if (externalTables && externalTables.fileList) {
			dataStore.loadEntriesFromFileList(externalTables.fileList);
		}
	}
</script>

<div>
	<div class="relative">
		<div class="h-screen w-full">
			{#if $filterStore.graphOptions}
				<div class="flex-grow flex-shrink">
					<div class="flex flex-col">
						<BasicGraph>
							{#if $filterStore.graphOptions instanceof PlaneGraphOptions}
								<PlaneGraph options={$filterStore.graphOptions} />
							{/if}
							<Minimal />
						</BasicGraph>
					</div>
				</div>
			{:else}
				<GridBackground />
			{/if}
			{#if $filterStore.selectedTables.length === 0}
				<div class="h-full w-full flex flex-col gap-10 justify-center items-center">
					<MessageCard>
						<TableSelection on:select={onTableSelected} />
					</MessageCard>
				</div>
			{/if}
		</div>
		{#if $filterStore.selectedTables.length !== 0}
			<FilterSidebar />
		{/if}

		{#if $filterStore.isLoading || $dataStore.isLoading}
			<LoadingOverlay isLoading={true} />
		{/if}
	</div>
</div>
