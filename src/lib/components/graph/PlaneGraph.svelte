<script lang="ts">
	import { getContext, onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import {
		PlaneRenderer,
		type IPlaneRendererData,
		type IPlaneSelection,
		type IPlaneData
	} from '$lib/rendering/PlaneRenderer';
	import Card from '../Card.svelte';
	import type { PlaneGraphModel } from '$lib/store/filterStore/graphs/plane';
	import { writable, type Unsubscriber } from 'svelte/store';
	import { dataStore as dbStore } from '$lib/store/dataStore/DataStore';
	import Button from '../button/Button.svelte';
	import { Axis } from '$lib/rendering/AxisRenderer';
	import { ButtonColor, ButtonSize, ButtonVariant } from '../button/type';
	import { Vector2, Vector3 } from 'three';
	import { fade } from 'svelte/transition';
	import LayerGroup, { type LayerSelectionEvent } from '../layerLegend/LayerGroup.svelte';
	import { getGraphContext, type GraphService } from '../BasicGraph.svelte';
	import SliceGraph from './SliceGraph.svelte';
	import type { ITiledDataRow } from '$lib/store/dataStore/filterActions';
	import { positionPortal } from '$lib/actions/portal';
	import { draggable } from '$lib/actions/draggable';
	import { CopyIcon, LayersIcon, LockIcon } from 'svelte-feather-icons';
	import notificationStore from '$lib/store/notificationStore';

	export let options: PlaneGraphModel;

	const graphService: GraphService = getGraphContext();

	let threeDomContainer: HTMLElement;
	let dataStore = options.dataStore;
	let dataRenderer: PlaneRenderer = new PlaneRenderer();
	let unsubscriber: Unsubscriber | undefined;
	let layerVisibility: [boolean, boolean[]][] = [];

	let isSelectionLocked = writable(false);

	let selection: IPlaneSelection | undefined;
	let mousePosition: Vector2 = new Vector2();
	let mouseClientPosition: THREE.Vector2 = new Vector2(0, 0);
	let selectionInfoPromise: Promise<Record<string, any> | undefined> | undefined;
	let xSlice: number = 0;
	let ySlice: number = 0;

	const bootstrap = () => {
		const { camera: graphCamera, scene, domElement } = graphService.getValues();
		threeDomContainer = domElement;
		dataRenderer?.setup(domElement, scene, graphCamera);

		// Listen to mouse move events on the domElement

		scene.add(dataRenderer);

		// call render event of graph before scene render is done
		graphService.registerOnBeforeRender(dataRenderer.onBeforeRender.bind(dataRenderer));
	};

	const update = (data?: IPlaneRendererData) => {
		if (!data || !dataRenderer) return;
		dataRenderer.setAxisLabelRenderer(labelForAxis);
		dataRenderer.update(data, options.renderSettings);
		layerVisibility = dataRenderer.getLayerVisibility();
	};

	const findRowData = async (tableName: string, row: ITiledDataRow) => {
		return await dbStore.getEntry(tableName, 'name', `'${row.name}'`);
	};

	const onMouseMove = (event: MouseEvent) => {
		if ($isSelectionLocked) {
			return;
		}

		const bounds = threeDomContainer.getBoundingClientRect();
		mouseClientPosition.x = event.clientX - bounds.left;
		mouseClientPosition.y = event.clientY - bounds.top;

		mousePosition.x = (mouseClientPosition.x / bounds.width) * 2 - 1;
		mousePosition.y = -(mouseClientPosition.y / bounds.height) * 2 + 1.0;

		const newSelection = dataRenderer?.getInfoAtPoint(mousePosition);

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

		if (selection.layer.meta) {
			if (selectionInfoPromise) {
				selectionInfoPromise;
			}
			selectionInfoPromise = findRowData(
				selection.parent ? selection.parent.name : selection.layer.name,
				 selection.dataIndex,
			);
		}
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

	function formatPowerOfTen(num: number) {
		if (num === 0) return '0';
		let exponent = Math.floor(Math.log10(Math.abs(num)));
		return `10^${exponent}`;
	}

	const labelForAxis = (axis: Axis, segment: number, numSegments: number) => {
		const store = dataStore;
		if (!store) {
			return;
		}

		const range = $dataStore!.ranges[axis];

		if (Axis.Y == axis && range) {
			return ((range[1] / numSegments) * segment).toFixed(2);
		}

		const tileRange = $dataStore!.tileRange[axis as keyof IPlaneRendererData['tileRange']];
		if (!range || !tileRange) {
			return segment.toFixed(4);
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

		return value.toFixed(3).toString();
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

	const copyValue = (value: string) => {
		navigator.clipboard.writeText(value);
		notificationStore.info({
			message: 'Value copied to clipboard',
			dismissDuration: 1000
		});
	};
</script>

<div class="absolute bottom-0 left-2">
	<Card noPad class="py-2 px-4"><SliceGraph bind:slice={xSlice} {options} {layerVisibility} /></Card
	>
	<Card noPad class="py-2 px-4"
		><SliceGraph bind:slice={ySlice} axis={Axis.Z} {options} {layerVisibility} /></Card
	>
</div>

<div class="plane-graph-ui legend absolute isolate left-2 top-16 w-[250px]">
	{#if $dataStore?.layers}
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
	{/if}
	{#if selection && $dataStore}
		<div
			use:draggable={{ enabled: isSelectionLocked }}
			use:positionPortal={mouseClientPosition}
			transition:fade={{ duration: 75 }}
			class="absolute rounded-lg border backdrop-blur-md border-slate-900 bg-slate-700/80 text-slate-100"
			class:shadow-lg={$isSelectionLocked}
			class:border-blue-500={$isSelectionLocked}
			class:border-2={$isSelectionLocked}
			style="font-family: monospace;"
		>
			<div class="px-3 pt-2">
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
									xSlice = selection.x;
									ySlice = selection.z;
								}
							}}><LayersIcon slot="leading" size="10" />Show</Button
						>
						<Button
							size={ButtonSize.SM}
							color={!$isSelectionLocked ? ButtonColor.INVERTED : ButtonColor.SECONDARY}
							on:click={() => ($isSelectionLocked = !$isSelectionLocked)}
							><LockIcon slot="leading" size="10" />x:{selection.x} z:{selection.z}</Button
						>
					</div>
				</div>
				<div class="flex justify-between gap-2">
					<span>[x]{$dataStore.labels.x}:</span>
					<span>{selection.point[0]}</span>
				</div>
				<div class="flex justify-between gap-2">
					<span>[y]{$dataStore.labels.y}:</span>
					<span>{selection.point[2]}</span>
				</div>
				<div class="flex justify-between gap-2">
					<span>[z]{$dataStore.labels.z}:</span>
					<span>{selection.point[1]}</span>
				</div>
			</div>
			{#if selectionInfoPromise}
				<hr class="border-slate-700 m-2" />
				<div class="px-3 pb-2 tooltip-content overflow-auto max-h-96 max-w-sm">
					{#await selectionInfoPromise}
						Loading info...
					{:then result}
						{#if result}
							{#each Object.entries(result) as [key, value]}
								<div class="flex gap-2 justify-between">
									<div>
										<Button
											variant={ButtonVariant.LINK}
											on:click={() => copyValue(value)}
											size={ButtonSize.SM}><b class="mr-2">{key}</b><CopyIcon size="12" /></Button
										>
									</div>

									<span>{value}</span>
								</div>
							{/each}
						{:else}
							Result empty
						{/if}
					{:catch err}
						Failed to load info {err}
					{/await}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style lang="scss">
	.tooltip-content {
		// Reset scroll bar styles
		&::-webkit-scrollbar {
			width: 0.4em;
		}

		&::-webkit-scrollbar-track {
			@apply dark:bg-slate-900 bg-slate-300;
			opacity: 0.01;
		}

		&::-webkit-scrollbar-thumb {
			@apply bg-slate-300 dark:bg-slate-600;
			border-radius: 20px;
		}

		&::-webkit-scrollbar-corner {
			opacity: 0.01;
		}
	}
</style>
