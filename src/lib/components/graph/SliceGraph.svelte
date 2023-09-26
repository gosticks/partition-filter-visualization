<script lang="ts">
	import type {
		IPlaneChildData,
		IPlaneData,
		IPlaneRendererData,
		PlaneRenderer
	} from '$lib/rendering/PlaneRenderer';
	import Slider, { type SliderInputEvent } from '../slider/Slider.svelte';
	import type { PlaneGraphOptions } from '$lib/store/filterStore/graphs/plane';
	import SliceSelection from './SliceSelection.svelte';
	import Dropdown, { getDropdownCtx } from '../Dropdown.svelte';
	import Button from '../button/Button.svelte';
	import { ButtonColor, ButtonSize, ButtonVariant } from '../button/type';
	import {
		ChevronDownIcon,
		ChevronUpIcon,
		EyeIcon,
		EyeOffIcon,
		InfoIcon,
		Maximize2Icon,
		MehIcon,
		MoveIcon
	} from 'svelte-feather-icons';
	import { PortalPlacement } from '$lib/actions/portal';
	import type { IGraph2dData } from './Graph2D.svelte';
	import Graph2D from './Graph2D.svelte';
	import type { LayerVisibilityList } from '../layerLegend/LayerGroup.svelte';
	import { Axis } from '$lib/rendering/AxisRenderer';
	import Dialog, { DialogSize } from '../dialog/Dialog.svelte';
	import type { ITableReference } from '$lib/store/filterStore/types';
	import type { ITiledDataRow } from '$lib/store/dataStore/filterActions';
	import DropdownSelect, { type DropdownSelectionEvent } from '../DropdownSelect.svelte';
	import BasicGraph from '../BasicGraph.svelte';
	import { DataScaling } from '$lib/store/dataStore/types';

	export let options: PlaneGraphOptions;
	export let layerVisibility: LayerVisibilityList;
	export let axis: Axis = Axis.X;
	// If enabled adds an expand button that rerenders the slice graph into a dialog
	export let allowsExpand = true;
	export let height = 200;
	export let width = 300;
	export let xAxisOffset = 30;
	export let yAxisOffset = 20;
	export let slice = 0;
	export let selected: number | undefined = undefined;

	let data: IGraph2dData | undefined;
	let dataStore = options.dataStore;
	let visibleLayers: (IPlaneData | IPlaneChildData)[] = [];

	let isSelectingSlice = false;
	let isSliceShown = false;
	let isCollapsed = false;
	let scale: DataScaling = DataScaling.LINEAR;

	function getVisibleLayers(data: IPlaneRendererData | undefined, visibility: LayerVisibilityList) {
		if (!data || visibility.length !== data.layers.length) {
			return [];
		}

		return data.layers.flatMap((layer, idx) => {
			const [visible, subLayerVisibility] = visibility[idx];
			const subLayers = (layer.layers ?? []).filter(
				(subLayer, subIdx) => subLayerVisibility[subIdx]
			);

			if (visible) {
				return [layer, ...subLayers];
			}
			return subLayers;
		});
	}

	function mapData(points: number[][], sliceIndex: number, axis: Axis): number[][] {
		console.log(points);
		switch (axis) {
			case Axis.X:
				return points[sliceIndex].map((y: number, idx) => [idx, y]);
			case Axis.Y:
				throw Error('Y slice rendering not supported');
			case Axis.Z:
				const res = points.map((ys, idx) => [idx, ys[sliceIndex]]);
				return res;
		}
	}

	function mapRowData(rows: ITiledDataRow[], sliceIndex: number, axis: Axis): number[][] {
		switch (axis) {
			case Axis.X:
				return rows.filter((row) => row.z === sliceIndex).map((row) => [row.rawX, row.y]);
			case Axis.Y:
				throw Error('Y slice rendering not supported');
			case Axis.Z:
				return rows.filter((row) => row.x === sliceIndex).map((row) => [row.rawZ, row.y]);
		}
	}

	function renderData(
		layers: (IPlaneData | IPlaneChildData)[],
		sliceIndex: number
	): IGraph2dData | undefined {
		// append the svg object to the body of the page
		// TODO: cleanup after this works correctly
		// convert to 2d data
		const data = layers.map((layer) => ({
			name: layer.name,
			color: layer.color,
			data: layer.meta?.rows
				? mapRowData(layer.meta.rows as ITiledDataRow[], sliceIndex, axis)
				: mapData(layer.points as number[][], sliceIndex, axis)
		}));

		if (!data || data.length === 0) {
			return;
		}

		if (!$dataStore) {
			return;
		}

		console.log($dataStore.ranges);

		switch (axis) {
			case Axis.X:
				return {
					xRange: $dataStore.ranges.x,
					yRange: $dataStore.ranges.y,
					xAxisLabel: $dataStore.labels.x,
					yAxisLabel: $dataStore.labels.y,
					points: data
				};
			case Axis.Y:
				throw new Error('Y axis not supported');
			case Axis.Z:
				return {
					xRange: $dataStore.ranges.z,
					yRange: $dataStore.ranges.y,
					xAxisLabel: $dataStore.labels.z,
					yAxisLabel: $dataStore.labels.y,
					points: data
				};
		}
	}
	$: visibleLayers = getVisibleLayers($dataStore, layerVisibility);
	$: {
		if (!$dataStore) {
			slice = 0;
		} else {
			// ensure we are not displaying outside the range
			slice = Math.min(axis === Axis.X ? $dataStore.tileRange.x : $dataStore.tileRange.z, slice);
		}
	}
	$: data = renderData(visibleLayers, slice);

	function onSliceSliderChange(evt: CustomEvent<SliderInputEvent>) {
		slice = evt.detail.value;
	}

	function onScaleSelected(evt: DropdownSelectionEvent<DataScaling>) {
		if (evt.detail.selected[0]) {
			scale = evt.detail.selected[0].value;
		}
	}
</script>

{#if (isSliceShown || isSelectingSlice) && $dataStore && allowsExpand}
	<SliceSelection
		scale={0.6}
		x={Axis.X === axis ? slice / $dataStore.tileRange.x : undefined}
		z={Axis.Z === axis ? slice / $dataStore.tileRange.z : undefined}
	/>
{/if}
<!-- Create a div where the graph will take place -->
{#if $dataStore}
	<div class="flex justify-between">
		<Button
			size={ButtonSize.SM}
			variant={ButtonVariant.LINK}
			on:click={() => (isCollapsed = !isCollapsed)}
			>{axis} Axis
			{#if isCollapsed}
				<ChevronDownIcon slot="trailing" size="14" />
			{:else}
				<ChevronUpIcon slot="trailing" size="14" />
			{/if}
		</Button>
		<div>
			{#if allowsExpand}
				<Button
					disabled={!data}
					color={isSliceShown ? ButtonColor.PRIMARY : ButtonColor.SECONDARY}
					on:click={() => (isSliceShown = !isSliceShown)}
					size={ButtonSize.SM}
					>{#if isSliceShown}<EyeIcon size="14" />{:else}<EyeOffIcon size="14" />{/if}</Button
				>
				<Dialog size={DialogSize.medium}>
					<Button slot="trigger" disabled={!data} size={ButtonSize.SM}
						><Maximize2Icon size="14" /></Button
					>
					<svelte:self
						width={window.innerWidth * 0.7}
						height={window.innerHeight * 0.7}
						{options}
						{axis}
						{layerVisibility}
						bind:slice
						allowsExpand={false}
					/>
				</Dialog>
			{/if}

			<DropdownSelect
				values={Object.values(DataScaling)}
				singular
				expand={false}
				size={ButtonSize.SM}
				on:select={onScaleSelected}
				optionConstructor={(value, index, meta) => {
					return {
						label: value,
						value: value,
						initiallySelected: value === scale,
						id: index
					};
				}}
			/>
			<Dropdown placement={PortalPlacement.TOP}>
				<svelte:fragment slot="trigger">
					{@const dropCtx = getDropdownCtx()}
					<Button disabled={!data} on:click={() => dropCtx.open()} size={ButtonSize.SM}
						><MoveIcon size="14" slot="leading" />
						<span style="font-family: monospace;"
							>[{slice}/{axis == Axis.X ? $dataStore.tileRange.x : $dataStore.tileRange.z}]</span
						></Button
					>
				</svelte:fragment>
				<div slot="content" class="p-2">
					{#if $dataStore}
						<Slider
							label="Select slice index"
							on:start={() => (isSelectingSlice = true)}
							on:input={onSliceSliderChange}
							on:change={() => (isSelectingSlice = false)}
							initialValue={2}
							min={0}
							max={axis == Axis.X ? $dataStore.tileRange.x : $dataStore.tileRange.z}
						/>
					{/if}
				</div>
			</Dropdown>
		</div>
	</div>
	{#if !isCollapsed}
		<div>
			{#if data}
				<div class="pr-2">
					<Graph2D {width} {height} {xAxisOffset} {yAxisOffset} {data} xScale={scale} />
				</div>
			{:else}
				<div class="w-52 h-52 flex flex-col gap-2 justify-center items-center">
					<InfoIcon />
					<span>No layers selected</span>
				</div>
			{/if}
		</div>
	{/if}
{/if}
