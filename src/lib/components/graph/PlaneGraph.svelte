<script lang="ts">
	import { getContext, onDestroy, onMount } from 'svelte';
	import type { GraphService } from './types';
	import { browser } from '$app/environment';
	import { PlaneRenderer, type IPlaneRendererData } from '$lib/rendering/PlaneRenderer';
	import Card from '../Card.svelte';
	import type { PlaneGraphOptions } from '$lib/store/filterStore/graphs/plane';
	import type { Unsubscriber } from 'svelte/store';
	import Button from '../button/Button.svelte';
	import type { Axis } from '$lib/rendering/AxisRenderer';
	import { ButtonColor, ButtonSize } from '../button/type';
	import { Vector3 } from 'three';

	export let options: PlaneGraphOptions;

	const graphService: GraphService = getContext('graph');

	let dataStore = options.dataStore;
	let dataRenderer: PlaneRenderer = new PlaneRenderer();
	let unsubscriber: Unsubscriber | undefined;
	let layerVisibility: boolean[] = [];

	const bootstrap = () => {
		const { camera: graphCamera, scene, domElement } = graphService.getValues();
		dataRenderer?.setup(domElement, scene, graphCamera);
		scene.add(dataRenderer);

		// call render event of graph before scene render is done
		graphService.registerOnBeforeRender(dataRenderer.onBeforeRender.bind(dataRenderer));
	};

	const updateWithData = (data?: IPlaneRendererData) => {
		if (!data || !dataRenderer) return;
		const { camera: graphCamera, scene, domElement } = graphService.getValues();
		dataRenderer.setAxisLabelRenderer(labelForAxis);
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

	function formatPowerOfTen(num: number) {
		if (num === 0) return '0';
		let exponent = Math.floor(Math.log10(Math.abs(num)));
		return `10^${exponent}`;
	}

	const labelForAxis = (axis: Axis, segment: number) => {
		const store = dataStore;
		if (!store) {
			return;
		}

		const range = $dataStore!.ranges[axis];
		const tileRange = $dataStore!.tileRange[axis as keyof IPlaneRendererData['tileRange']];
		if (!range || !tileRange) {
			return segment.toFixed(2);
		}
		const [min, max] = range;

		// Skip every second value
		if (segment % 2 === 0) {
			return null;
		}
		const value = (segment / tileRange) * max;

		if (Math.abs(value) < 0.01 || Math.abs(value) > 1000) {
			return formatPowerOfTen(value);
			// const exponent = Math.floor(Math.log10(Math.abs(value)));
			// const coefficient = value / Math.pow(10, exponent);
			// return `${coefficient.toFixed(2)}e${exponent >= 0 ? '+' : ''}${exponent}`;
		}

		return value.toFixed(2).toString();
	};

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

<div class="plane-graph-ui legend absolute isolate left-2 top-16 w-[250px]">
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
			size={ButtonSize.SM}
			color={ButtonColor.SECONDARY}
			class="mt-2"
			disabled={layerVisibility.every((l) => l === true)}
			on:click={showAllLayers}>Show all</Button
		>
		<Button
			size={ButtonSize.SM}
			color={ButtonColor.SECONDARY}
			class="mt-2"
			disabled={layerVisibility.every((l) => l === false)}
			on:click={hideAllLayers}>Hide all</Button
		>
	</Card>
</div>
