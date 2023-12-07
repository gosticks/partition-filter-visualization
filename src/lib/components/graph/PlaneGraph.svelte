<script lang="ts">
	import DbDataTooltip from '../DbDataTooltip.svelte';
	import { onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import {
		PlaneRenderer,
		type IPlaneRendererData,
		type IPlaneSelection,
		type IPlaneData
	} from '$lib/rendering/PlaneRenderer';
	import Card from '../Card.svelte';
	import type { PlaneGraphModel } from '$lib/store/filterStore/graphs/plane';
	import { type Unsubscriber, get, writable } from 'svelte/store';
	import Button from '../button/Button.svelte';
	import { Axis, type AxisLabelRenderer } from '$lib/rendering/AxisRenderer';
	import { ButtonColor, ButtonSize } from '../button/type';
	import { Vector2 } from 'three';
	import LayerGroup, {
		type LayerColorSelectionEvent,
		type LayerSelectionEvent
	} from '../layerLegend/LayerGroup.svelte';
	import { getGraphContext, type GraphService } from '../BasicGraph.svelte';
	import SliceGraph from './SliceGraph.svelte';
	import { LayersIcon, LockIcon } from 'svelte-feather-icons';

	import Grid from './Grid.svelte';
	import AxisRenderer from './AxisRenderer.svelte';
	import { DataScaling } from '$lib/store/dataStore/types';
	import { labelSkipFactor, scaleDecoder } from '$lib/util';
	import Selection3D from './Selection3D.svelte';

	export let options: PlaneGraphModel;

	const graphService: GraphService = getGraphContext();
	export let graphScale: number;
	let threeDomContainer: HTMLElement;

	let dataStore = options.dataStore;
	let graphOptionStore = options.optionsStore;

	let dataRenderer: PlaneRenderer = new PlaneRenderer();
	let unsubscriber: Unsubscriber | undefined;
	let layerVisibility: [boolean, boolean[]][] = [];

	let isSelectionDisplayLocked = writable(false);
	let selection: IPlaneSelection | undefined;

	let mousePosition: Vector2 = new Vector2();
	let mouseClientPosition: THREE.Vector2 = new Vector2(0, 0);

	let xSlice: number = 0;
	let ySlice: number = 0;

	const bootstrap = () => {
		const { camera: graphCamera, scene, domElement } = graphService.getValues();
		threeDomContainer = domElement;
		dataRenderer?.setup(domElement, scene, graphCamera, graphScale);

		// Listen to mouse move events on the domElement

		scene.add(dataRenderer);

		// call render event of graph before scene render is done
		graphService.registerOnBeforeRender(dataRenderer.onBeforeRender.bind(dataRenderer));
	};

	const update = (data?: IPlaneRendererData) => {
		if (!data || !dataRenderer) return;
		dataRenderer.update(data, get(options.renderStore));
		layerVisibility = dataRenderer.getLayerVisibility();
	};

	const onMouseMove = (event: MouseEvent) => {
		if ($isSelectionDisplayLocked) {
			return;
		}

		const bounds = threeDomContainer.getBoundingClientRect();
		mouseClientPosition.x = event.clientX - bounds.left;
		mouseClientPosition.y = event.clientY - bounds.top;

		mousePosition.x = (mouseClientPosition.x / bounds.width) * 2 - 1;
		mousePosition.y = -(mouseClientPosition.y / bounds.height) * 2 + 1.0;

		const newSelection = dataRenderer?.selectionAtPoint(mousePosition);

		if (!newSelection) {
			selection = newSelection;
			return;
		}

		const selectionChanged =
			!selection ||
			newSelection.layer !== selection?.layer ||
			newSelection.point !== selection?.point;

		if (!selectionChanged) {
			return;
		}
		selection = newSelection;
	};

	onMount(() => {
		if (!browser) return;
		bootstrap();

		threeDomContainer.addEventListener('mousemove', onMouseMove);

		let dataUnsub = options.dataStore.subscribe(update);

		unsubscriber = () => {
			dataUnsub();
		};
	});

	onDestroy(() => {
		dataRenderer?.destroy();
		threeDomContainer.removeEventListener('mousemove', onMouseMove);
		unsubscriber?.();
	});

	const onLayerSelected = (evt: CustomEvent<LayerSelectionEvent<IPlaneData, any>>) => {
		if (evt.detail.subIndex !== undefined) {
			dataRenderer.toggleSublayerVisibility(evt.detail.index, evt.detail.subIndex);
		} else {
			dataRenderer.toggleLayerVisibility(evt.detail.index);
		}
		layerVisibility = dataRenderer.getLayerVisibility();
	};

	const onColorSelected = (evt: CustomEvent<LayerColorSelectionEvent<IPlaneData, any>>) => {
		if (evt.detail.color) {
			options.setColorForLayer(evt.detail.color, evt.detail.layer, evt.detail.subIndex);
		}
	};

	const showAllLayers = () => {
		dataRenderer.showAllLayers();
		layerVisibility = dataRenderer.getLayerVisibility();
	};

	const hideAllLayers = () => {
		dataRenderer.hideAllLayers();
		layerVisibility = dataRenderer.getLayerVisibility();
	};

	const axisValueDecoder = (axis: Axis) => {
		switch (axis) {
			case Axis.X:
				return scaleDecoder($graphOptionStore.scaleX ?? DataScaling.LINEAR);
			case Axis.Y:
				return scaleDecoder($graphOptionStore.scaleY ?? DataScaling.LINEAR);
			case Axis.Z:
				return scaleDecoder($graphOptionStore.scaleZ ?? DataScaling.LINEAR);
		}
	};

	const selectionValueForAxis = (axis: Axis) => {
		switch (axis) {
			case Axis.X:
				return () => selection?.layer.meta?.rows[selection.dataIndex].rawX ?? '-';
			case Axis.Y:
				return () => selection?.layer.meta?.rows[selection.dataIndex].rawY ?? '-';
			case Axis.Z:
				return () => selection?.layer.meta?.rows[selection.dataIndex].rawZ ?? '-';
		}
	};

	const labelRenderer = (axis: Axis) => {
		if (!$dataStore) {
			return undefined;
		}

		let range = [0, 1];
		let valueDecoder = axisValueDecoder(axis);
		switch (axis) {
			case Axis.X:
				range = $dataStore.ranges.x;
				break;
			case Axis.Y:
				range = $dataStore.ranges.y;
				break;
			case Axis.Z:
				range = $dataStore.ranges.z;
				break;
		}

		const formatter: AxisLabelRenderer = (axis, segment, total) => {
			if (segment % labelSkipFactor(total)) {
				return null;
			}

			return `${valueDecoder(range[0] + ((range[1] - range[0]) / total) * segment).toPrecision(2)}`;
		};

		return formatter;
	};

	let xLabelRenderer = labelRenderer(Axis.X);
	let zLabelRenderer = labelRenderer(Axis.Z);
	let yLabelRenderer = labelRenderer(Axis.Y);

	$: $dataStore, $graphOptionStore, (xLabelRenderer = labelRenderer(Axis.X));
	$: $dataStore, $graphOptionStore, (yLabelRenderer = labelRenderer(Axis.Y));
	$: $dataStore, $graphOptionStore, (zLabelRenderer = labelRenderer(Axis.Z));
</script>

<div class="absolute flex flex-col items-start bottom-0 left-2">
	{#if $dataStore?.layers}
		<Card noPad>
			<details>
				<summary class="px-4 pt-2 mb-2">
					<div class="inline-block min-w-56 font-bold">
						<h2>Layers</h2>
					</div>
				</summary>
				<div class="max-h-96 px-4 py-2 border-b dark:border-background-800 border-t overflow-auto">
					{#if $dataStore}
						<LayerGroup
							selection={selection?.layer}
							on:select={onLayerSelected}
							on:color={onColorSelected}
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
			</details>
		</Card>
	{/if}
	<Card noPad class="py-2 px-4"><SliceGraph bind:slice={xSlice} {options} {layerVisibility} /></Card
	>
	<Card noPad class="py-2 px-4"
		><SliceGraph bind:slice={ySlice} axis={Axis.Z} {options} {layerVisibility} /></Card
	>
</div>

<div class="plane-graph-ui legend absolute isolate left-2 top-16 w-[250px]">
	{#if $dataStore}
		<Grid xDivisions={$dataStore.tileRange.x} zDivisions={$dataStore.tileRange.z} scale={0.6} />

		<AxisRenderer
			xDivisions={$dataStore.tileRange.x}
			zDivisions={$dataStore.tileRange.z}
			xLabel={$dataStore.labels.x}
			yLabel={$dataStore.labels.y}
			zLabel={$dataStore.labels.z}
			xSegmentLabeler={xLabelRenderer}
			ySegmentLabeler={yLabelRenderer}
			zSegmentLabeler={zLabelRenderer}
			scale={0.6}
		/>
	{/if}
	<Selection3D {selection} scale={0.6} />
	{#if selection && $dataStore}
		<DbDataTooltip
			absolutePosition={mouseClientPosition}
			tableName={selection.layer.name}
			dbEntryId={selection.dbEntryId}
			isLocked={$isSelectionDisplayLocked}
		>
			<div class="flex pb-2 justify-between items-center whitespace-nowrap gap-2 flex-nowrap">
				<div>
					<div
						class="flex-shrink-0 rounded-full border border-slate-800"
						style={`background-color: ${selection.layer.color}; width: 12px; height:12px; display: inline-block;`}
					/>
					<span class="font-bold">{selection.layer.name}</span>
				</div>
				<div>
					<Button
						size={ButtonSize.SM}
						color={ButtonColor.INVERTED}
						on:click={() => {
							if (selection) {
								xSlice = selection.point[0];
								ySlice = selection.point[2];
							}
						}}><LayersIcon slot="leading" size="10" />Show</Button
					>
					<Button
						size={ButtonSize.SM}
						color={!$isSelectionDisplayLocked ? ButtonColor.INVERTED : ButtonColor.SECONDARY}
						on:click={() => ($isSelectionDisplayLocked = !$isSelectionDisplayLocked)}
						><LockIcon slot="leading" size="10" />x:{selection.point[0]} z:{selection
							.point[1]}</Button
					>
				</div>
			</div>
			<div class="flex justify-between gap-2">
				<span>[x]{$dataStore.labels.x}:</span>
				<span>{selectionValueForAxis(Axis.X)()}</span>
			</div>
			<div class="flex justify-between gap-2">
				<span>[y]{$dataStore.labels.y}:</span>
				<span>{selectionValueForAxis(Axis.Y)()}</span>
			</div>
			<div class="flex justify-between gap-2">
				<span>[z]{$dataStore.labels.z}:</span>
				<span>{selectionValueForAxis(Axis.Z)()}</span>
			</div>
		</DbDataTooltip>
	{/if}
</div>
