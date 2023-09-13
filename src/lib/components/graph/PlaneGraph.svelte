<script lang="ts">
	import { getContext, onDestroy, onMount } from 'svelte';
	import type { GraphService } from './types';
	import { browser } from '$app/environment';
	import { PlaneRenderer, type IPlaneRendererData } from '$lib/rendering/PlaneRenderer';
	import Card from '../Card.svelte';
	import type { PlaneGraphOptions } from '$lib/store/filterStore/graphs/plane';
	import type { Unsubscriber } from 'svelte/store';
	import Button from '../Button.svelte';

	export let options: PlaneGraphOptions;

	const graphService: GraphService = getContext('graph');

	let dataStore = options.dataStore;
	let dataRenderer: PlaneRenderer = new PlaneRenderer();
	let unsubscriber: Unsubscriber | undefined;
	let layerVisibility: boolean[] = [];

	const bootstrap = () => {
		const { camera: graphCamera, scene, domElement } = graphService.getValues();

		dataRenderer?.setup(domElement, scene, graphCamera);
	};

	const updateWithData = (data?: IPlaneRendererData) => {
		if (!data || !dataRenderer) return;
		dataRenderer.updateWithData(data);
		layerVisibility = dataRenderer.getLayerVisibility();
	};

	onMount(() => {
		if (!browser) return;
		bootstrap();
		unsubscriber = options.dataStore.subscribe(updateWithData);
	});

	onDestroy(() => {
		dataRenderer?.destroy();
		unsubscriber?.();
	});

	const toggleLayerVisibility = (index: number) => {
		dataRenderer.toggleLayerVisibility(index);
		layerVisibility = dataRenderer.getLayerVisibility();
	};

	const showAllLayers = () => {
		dataRenderer.showAllLayers();
		layerVisibility = dataRenderer.getLayerVisibility();
	};

	const hideAllLayers = () => {
		dataRenderer.hideAllLayers();
		layerVisibility = dataRenderer.getLayerVisibility();
	};
</script>

<div class="plane-graph-ui legend absolute isolate left-4 bottom-80 w-[250px]">
	<Card title="Layers">
		{#if $dataStore}
			{#each layerVisibility as visible, index}
				{@const layer = $dataStore.layers[index]}
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<div
					class="flex gap-4 pb-2 cursor-pointer"
					class:opacity-30={!visible}
					on:click={() => toggleLayerVisibility(index)}
				>
					<div
						class="w-5 h-5 rounded-full bg-slate-300"
						style={`background-color: ${layer.color ?? '#eeeeee'};`}
					/>
					<p>{layer.name}</p>
				</div>
			{/each}
		{/if}
		<Button
			size="sm"
			color="secondary"
			class="mt-2"
			disabled={layerVisibility.every((l) => l === true)}
			on:click={showAllLayers}>Show all</Button
		>
		<Button
			size="sm"
			color="secondary"
			class="mt-2"
			disabled={layerVisibility.every((l) => l === false)}
			on:click={hideAllLayers}>Hide all</Button
		>
	</Card>
</div>
