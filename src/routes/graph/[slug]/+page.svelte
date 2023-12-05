<script context="module">
</script>

<script lang="ts">
	import type { PageServerData } from './$types';
	import BasicGraph, { type CameraState, type GraphService } from '$lib/components/BasicGraph.svelte';
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';
	import { dataStore } from '$lib/store/dataStore/DataStore';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import FilterSidebar from '$lib/components/FilterSidebar.svelte';
	import GridBackground from '$lib/components/GridBackground.svelte';
	import filterStore from '$lib/store/filterStore/FilterStore';
	import Minimap from '$lib/components/graph/Minimap.svelte';
	import PlaneGraph from '$lib/components/graph/PlaneGraph.svelte';
	import { PlaneGraphModel } from '$lib/store/filterStore/graphs/plane';
	import { Euler, Vector3 } from 'three';
	import type { GraphStateConfig } from '$lib/store/filterStore/types';

	export let data: PageServerData;
	let setCameraState: (state: CameraState) => void;
	// Accessing the slug parameter
	$: slug = $page.params.slug;



	onMount(async () => {
		if (!browser) return;
		let selectedGraph: GraphStateConfig | undefined = undefined;
		if (slug !== 'custom') {
			selectedGraph = JSON.parse(await (await fetch(`/graphs/${slug}.json`)).text());
		}

		//

		// Pass possible db options to the filter sidebar
		await filterStore.initWithPreloadedDatasets(data.dataset, selectedGraph);

		if (selectedGraph?.ui) {
			if (selectedGraph.ui.position && selectedGraph.ui.rotation) {
				setCameraState({position:
					new Vector3(
						selectedGraph.ui.position.x,
						selectedGraph.ui.position.y,
						selectedGraph.ui.position.z,
					),
					rotation: new Euler(
						selectedGraph.ui.rotation.x,
						selectedGraph.ui.rotation.y,
						selectedGraph.ui.rotation.z,
					)
				});
			}
		}
	});
</script>

<div class="h-screen w-full relative">
	<BasicGraph>
	<svelte:fragment slot="inner">
			{#if $filterStore.graphOptions}
				{#if $filterStore.graphOptions instanceof PlaneGraphModel}
					<PlaneGraph options={$filterStore.graphOptions} />
				{/if}
				<Minimap bind:setCameraState={setCameraState} />
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
