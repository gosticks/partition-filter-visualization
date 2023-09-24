<script lang="ts">
	import { getContext, onDestroy, onMount } from 'svelte';
	import type { GraphService } from './types';
	import { browser } from '$app/environment';
	import {
		PlaneRenderer,
		type IPlaneRendererData,
		type IPlaneSelection,
		type IPlaneData
	} from '$lib/rendering/PlaneRenderer';
	import Card from '../Card.svelte';
	import type { PlaneGraphOptions } from '$lib/store/filterStore/graphs/plane';
	import type { Unsubscriber } from 'svelte/store';
	import { dataStore as dbStore } from '$lib/store/dataStore/DataStore';
	import Button from '../button/Button.svelte';
	import { Axis } from '$lib/rendering/AxisRenderer';
	import { ButtonColor, ButtonSize } from '../button/type';
	import { Vector2, Vector3 } from 'three';
	import { fade } from 'svelte/transition';
	import LayerGroup from '../layerLegend/LayerGroup.svelte';
	import type { LayerSelectionEvent } from '../layerLegend/event';

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

		let dataUnsub = options.dataStore.subscribe(updateWithData);

		unsubscriber = () => {
			dataUnsub();
		};
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

	const onLayerSelected = (evt: CustomEvent<LayerSelectionEvent<IPlaneData, any>>) => {
		if (evt.detail.subIndex !== undefined) {
			dataRenderer.toggleSublayerVisibility(evt.detail.index, evt.detail.subIndex);
		} else {
			dataRenderer.toggleLayerVisibility(evt.detail.index);
		}
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

<!-- <SliceSelection
	scale={0.6}
	x={normalizedValueForSelection(Axis.X, selection)}
	z={normalizedValueForSelection(Axis.Z, selection)}
/> -->
<div class="plane-graph-ui legend absolute isolate left-2 top-16 w-[250px]">
	<Card title="Layers" noPad>
		<div class="max-h-96 px-4 py-2 border-b dark:border-background-800 border-t overflow-auto">
			{#if $dataStore}
				<LayerGroup
					selection={selection?.layer}
					on:select={onLayerSelected}
					{layerVisibility}
					layers={$dataStore.layers}
				/>
			{/if}
		</div>
		<div class="px-4 pb-2">
			<Button
				size={ButtonSize.SM}
				color={ButtonColor.SECONDARY}
				class="mt-2"
				disabled={layerVisibility.every(
					([l, children]) => l === true && children.every((l) => l === true)
				)}
				on:click={showAllLayers}>Show all</Button
			>
			<Button
				size={ButtonSize.SM}
				color={ButtonColor.SECONDARY}
				class="mt-2"
				disabled={layerVisibility.every(
					([l, children]) => l !== true && children.every((l) => l !== true)
				)}
				on:click={hideAllLayers}>Hide all</Button
			>
		</div>
	</Card>
	{#if selection && $dataStore}
		<div
			transition:fade={{ duration: 75 }}
			class="absolute px-3 py-2 rounded-lg border backdrop-blur-md border-slate-900 bg-slate-700/80 text-slate-100"
			style="left: {mouseClientPosition.x}px; top: {mouseClientPosition.y -
				40}px; font-family: monospace;"
		>
			<div class="flex justify-between whitespace-nowrap gap-2 flex-nowrap">
				<div>
					<div
						class="flex-shrink-0 rounded-full border border-slate-800"
						style={`background-color: ${selection.layer.color}; width: 12px; height:12px; display: inline-block;`}
					/>
					<span class="font-bold">{selection.layer.name}</span>
				</div>
				<span class="text-slate-400">x:{selection.x} z:{selection.z}</span>
			</div>
			<div class="flex justify-between gap-2">
				<span>[x]{$dataStore.labels.x}:</span>
				<span>{selection.normalizedCoords.x * $dataStore.ranges.x[1]}</span>
			</div>
			<div class="flex justify-between gap-2">
				<span>[y]{$dataStore.labels.y}:</span>
				<span>{selection.normalizedCoords.y * $dataStore.ranges.y[1]}</span>
			</div>
			<div class="flex justify-between gap-2">
				<span>[z]{$dataStore.labels.z}:</span>
				<span>{selection.normalizedCoords.z * $dataStore.ranges.z[1]}</span>
			</div>
		</div>
	{/if}
</div>
