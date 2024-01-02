<script context="module">
</script>

<script lang="ts">
	import type { PageServerData } from './$types';
	import BasicGraph, { type CameraState } from '$lib/components/BasicGraph.svelte';
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
	import Button from '$lib/components/button/Button.svelte';
	import { ButtonVariant } from '$lib/components/button/type';
	import { ArrowLeftCircleIcon } from 'svelte-feather-icons';

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
	<BasicGraph>
		<svelte:fragment slot="inner">
			{#if $filterStore.graphOptions}
				{#if $filterStore.graphOptions instanceof PlaneGraphModel}
					<PlaneGraph options={$filterStore.graphOptions} graphScale={0.6} />
				{/if}
				<Minimap bind:setCameraState />
			{:else}
				<GridBackground />
			{/if}
		</svelte:fragment>
		<FilterSidebar />
	</BasicGraph>
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
