<script lang="ts">
	import { getContext, onDestroy, onMount } from 'svelte';
	import type { GraphService } from './types';
	import { browser } from '$app/environment';
	import {
		PlaneRenderer,
		type IPlaneRendererData,
		type IPlaneSelection
	} from '$lib/rendering/PlaneRenderer';
	import Card from '../Card.svelte';
	import type { PlaneGraphOptions } from '$lib/store/filterStore/graphs/plane';
	import type { Unsubscriber } from 'svelte/store';
	import Button from '../button/Button.svelte';
	import { Axis } from '$lib/rendering/AxisRenderer';
	import { ButtonColor, ButtonSize } from '../button/type';
	import { Vector2, Vector3 } from 'three';
	import { fade } from 'svelte/transition';
	import SliceSelection from './SliceSelection.svelte';

	export let options: PlaneGraphOptions;

	const graphService: GraphService = getContext('graph');

	let threeDomContainer: HTMLElement;
	let dataStore = options.dataStore;
	let dataRenderer: PlaneRenderer = new PlaneRenderer();
	let unsubscriber: Unsubscriber | undefined;
	let layerVisibility: [boolean, boolean[]][] = [];

	let selection: IPlaneSelection | undefined;
	let mousePosition: Vector2 = new Vector2();
	let mouseClientPosition: THREE.Vector2 = new Vector2(0, 0);

	const bootstrap = () => {
		const { camera: graphCamera, scene, domElement } = graphService.getValues();
		threeDomContainer = domElement;
		dataRenderer?.setup(domElement, scene, graphCamera);

		// Listen to mouse move events on the domElement

		scene.add(dataRenderer);

		// call render event of graph before scene render is done
		graphService.registerOnBeforeRender(dataRenderer.onBeforeRender.bind(dataRenderer));
	};

	const updateWithData = (data?: IPlaneRendererData) => {
		if (!data || !dataRenderer) return;
		dataRenderer.setAxisLabelRenderer(labelForAxis);
		dataRenderer.updateWithData(data);
		layerVisibility = dataRenderer.getLayerVisibility();
	};

	onMount(() => {
		if (!browser) return;
		bootstrap();

		const onMouseMove = (event: MouseEvent) => {
			const bounds = threeDomContainer.getBoundingClientRect();
			mouseClientPosition.x = event.clientX - bounds.left;
			mouseClientPosition.y = event.clientY - bounds.top;

			mousePosition.x = (mouseClientPosition.x / bounds.width) * 2 - 1;
			mousePosition.y = -(mouseClientPosition.y / bounds.height) * 2 + 1.0;

			selection = dataRenderer?.getInfoAtPoint(mousePosition);
		};

		threeDomContainer.addEventListener('mousemove', onMouseMove);

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
		}

		return value.toFixed(2).toString();
	};

	const toggleLayerVisibility = (index: number) => {
		dataRenderer.toggleLayerVisibility(index);
		layerVisibility = dataRenderer.getLayerVisibility();
	};

	const toggleSublayerVisibility = (index: number, subindex: number) => {
		dataRenderer.toggleSublayerVisibiliry(index, subindex);
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

	const normalizedValueForSelection = (axis: Axis, selection?: IPlaneSelection) => {
		if (!selection) {
			return;
		}

		switch (axis) {
			case Axis.X:
				return selection.x / (selection.layer.points[0].length - 1);
			case Axis.Y:
				return selection.y / selection.layer.max;
			case Axis.Z:
				return selection.z / (selection.layer.points.length - 1);
		}
	};
</script>

<SliceSelection
	scale={0.6}
	x={normalizedValueForSelection(Axis.X, selection)}
	z={normalizedValueForSelection(Axis.Z, selection)}
/>
<div class="plane-graph-ui legend absolute isolate left-2 top-16 w-[250px]">
	<Card title="Layers" noPad>
		<div class="max-h-96 px-4 py-2 border-b dark:border-background-800 border-t overflow-auto">
			{#if $dataStore}
				{#each layerVisibility as [visible, childVisibility], index}
					{@const layer = $dataStore.layers[index]}
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<div class="pb-2">
						<div
							class="flex gap-4 pb items-center justify-between cursor-pointer"
							class:opacity-30={!visible}
							on:click={() => toggleLayerVisibility(index)}
						>
							<p class="font-semibold">{layer.name}</p>
							<div
								class="w-4 h-4 rounded-full border border-slate-800"
								style={`background-color: ${layer.color ?? '#eeeeee'};`}
							/>
						</div>
						{#if layer.layers}
							<ul class="pl-2 pr-[2px] overflow-clip">
								{#each layer.layers as subLayer, subindex}
									{@const sublayerVisible = childVisibility[subindex]}
									<li
										class="flex gap-2 justify-between items-center cursor-pointer"
										on:click={() => toggleSublayerVisibility(index, subindex)}
										class:opacity-30={!sublayerVisible}
									>
										<div class="flex gap-1 flex-shrink items-center">
											<p
												class="w-6 h-8 -mt-7 border-b border-l border-slate-300 pointer-events-none dark:border-background-700"
											/>
											<p class="text-sm flex-shrink text-ellipsis overflow-hidden">
												{subLayer.name}
											</p>
										</div>
										<div
											class="w-3 h-3 flex-shrink-0 rounded-full border border-slate-800"
											style={`background-color: ${subLayer.color ?? '#eeeeee'};`}
										/>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
		<div class="px-4 pb-2">
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
		</div>
	</Card>
	{#if selection}
		<div
			transition:fade={{ duration: 75 }}
			class="absolute px-3 py-2 rounded-lg border backdrop-blur-md border-slate-900 bg-slate-700/80 text-slate-100 w-48"
			style="left: {mouseClientPosition.x}px; top: {mouseClientPosition.y -
				40}px; font-family: monospace;"
		>
			{selection.layer.name} - ({selection.x}, {selection.y}, {selection.z})
		</div>
	{/if}
</div>
