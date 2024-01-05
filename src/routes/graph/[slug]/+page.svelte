<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import CoreGraph, { type CameraState } from '$lib/views/CoreGraph.svelte';
	import GridBackground from '$lib/components/GridBackground.svelte';
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';
	import Button from '$lib/components/button/Button.svelte';
	import { ButtonVariant } from '$lib/components/button/type';
	import Minimap from '$lib/components/graph/Minimap.svelte';
	import PlaneGraph from '$lib/components/graph/PlaneGraph.svelte';
	import { dataStore } from '$lib/store/dataStore/DataStore';
	import filterStore from '$lib/store/filterStore/FilterStore';
	import { PlaneGraphModel } from '$lib/store/filterStore/graphs/plane';
	import type { GraphStateConfig } from '$lib/store/filterStore/types';
	import FilterSidebar from '$lib/views/FilterSidebar.svelte';
	import { onMount } from 'svelte';
	import { ArrowLeftCircleIcon } from 'svelte-feather-icons';
	import { Euler, Vector3 } from 'three';
	import type { PageServerData } from './$types';

	export let data: PageServerData;
	let loadedGraph: GraphStateConfig | undefined = undefined;
	let setCameraState: (state: CameraState) => void;
	// Accessing the slug parameter
	$: slug = $page.params.slug;

	onMount(async () => {
		if (!browser) return;
		if (slug !== 'custom') {
			loadedGraph = JSON.parse(await (await fetch(`/graphs/${slug}.json`)).text());
		}

		// Pass possible db options to the filter sidebar
		await filterStore.initWithPreloadedDatasets(data.dataset, loadedGraph);

		if (loadedGraph?.ui) {
			if (loadedGraph.ui.position && loadedGraph.ui.rotation) {
				setCameraState({
					position: new Vector3(
						loadedGraph.ui.position.x,
						loadedGraph.ui.position.y,
						loadedGraph.ui.position.z
					),
					rotation: new Euler(
						loadedGraph.ui.rotation.x,
						loadedGraph.ui.rotation.y,
						loadedGraph.ui.rotation.z
					)
				});
			}
		}
	});
</script>

<div class="h-screen w-full relative">
	<CoreGraph>
		<svelte:fragment slot="inner">
			{#if $filterStore.graphOptions}
				{#if $filterStore.graphOptions instanceof PlaneGraphModel}
					<PlaneGraph options={$filterStore.graphOptions} graphScale={0.6} />
				{/if}
				<Minimap />
			{:else}
				<GridBackground />
			{/if}
		</svelte:fragment>
		<FilterSidebar />
	</CoreGraph>
	<div class="absolute left-3 top-4 text-lg font-bold flex gap-2 items-center">
		<a href="/"><Button variant={ButtonVariant.LINK}><ArrowLeftCircleIcon /></Button></a>
		<div>
			{loadedGraph?.name ?? 'Untitled Graph'}
		</div>
	</div>

	{#if $filterStore.isLoading || $dataStore.isLoading}
		<LoadingOverlay isLoading={true} />
	{/if}
</div>
