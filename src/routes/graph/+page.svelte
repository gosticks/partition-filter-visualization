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
	import filterStore from '$lib/store/filterStore/FilterStore';
	import Minimal from '$lib/components/graph/Minimal.svelte';
	import PlaneGraph from '$lib/components/graph/PlaneGraph.svelte';
	import { PlaneGraphOptions } from '$lib/store/filterStore/graphs/plane';
	import type {
		DatasetSelectionEvent,
		TableSelectionEvent
	} from '$lib/components/tableSelection/TableSelection.svelte';

	export let data: PageServerData;

	onMount(async () => {
		if (!browser) return;

		console.log({ dataset: data.dataset });

		// Pass possible db options to the filter sidebar
		await filterStore.initWithPreloadedDatasets(data.dataset);
	});
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
		</div>
		<FilterSidebar />

		{#if $filterStore.isLoading || $dataStore.isLoading}
			<LoadingOverlay isLoading={true} />
		{/if}
	</div>
</div>
