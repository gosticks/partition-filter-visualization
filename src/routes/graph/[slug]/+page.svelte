<script lang="ts">
	import type { PageServerData } from '../$types';
	import BasicGraph, { type CameraState, type GraphService } from '$lib/components/BasicGraph.svelte';
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';
	import { Euler, Vector3, type Vector2 } from 'three';
	import { dataStore } from '$lib/store/dataStore/DataStore';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
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
	let setCameraState: (state: CameraState) => void;
	// Accessing the slug parameter
	$: slug = $page.params.slug;

	onMount(async () => {
		if (!browser) return;
		let selectedGraph: any;
		if (slug !== 'custom') {
			selectedGraph = JSON.parse(await (await fetch(`/graphs/${slug}.json`)).text());
		}

		// Pass possible db options to the filter sidebar
		await filterStore.initWithPreloadedDatasets(data.dataset, selectedGraph);


		if (selectedGraph["ui"]) {
			const rotation = new Euler(selectedGraph["ui"].rotation.x, selectedGraph["ui"].rotation.y, selectedGraph["ui"].rotation.z);
			const position = new Vector3(selectedGraph["ui"].position.x, selectedGraph["ui"].position.y, selectedGraph["ui"].position.z);
			console.log({rotation, position});

			// FIXME: something is resetting position
			setCameraState({position, rotation});
		}
	});
</script>

<div class="h-screen w-full relative">
	<BasicGraph>
	<svelte:fragment slot="inner">
			{#if $filterStore.graphOptions}
				{#if $filterStore.graphOptions instanceof PlaneGraphOptions}
					<PlaneGraph options={$filterStore.graphOptions} />
				{/if}
				<Minimal bind:setCameraState={setCameraState} />
			{:else}
			<GridBackground />
			{/if}

	</svelte:fragment>
		<FilterSidebar />
	</BasicGraph>
	{#if $filterStore.isLoading || $dataStore.isLoading}
	<LoadingOverlay isLoading={true} />
	{/if}
</div>
