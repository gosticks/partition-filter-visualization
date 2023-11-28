<script lang="ts">
	import { dataStore } from '$lib/store/dataStore/DataStore';
	import filterStore from '$lib/store/filterStore/FilterStore';
	import settingsStore, { Theme } from '$lib/store/SettingsStore';
	import { getContext, onMount } from 'svelte';
	import Button from './button/Button.svelte';
	import Card from './Card.svelte';
	import { GraphOptions, GraphType } from '$lib/store/filterStore/types';
	import OptionRenderer from './OptionRenderer.svelte';
	import Divider from './base/Divider.svelte';
	import {
		CameraIcon,
		InfoIcon,
		LayersIcon,
		MoonIcon,
		PlusIcon,
		RefreshCcwIcon,
		SettingsIcon,
		SunIcon,
		XIcon
	} from 'svelte-feather-icons';
	import { ButtonColor, ButtonSize, ButtonVariant } from './button/type';
	import Dialog, { DialogSize, getDialogContext } from './dialog/Dialog.svelte';
	import TableSelection, {
		type DatasetSelectionEvent,
		type TableSelectionEvent
	} from './tableSelection/TableSelection.svelte';
	import QueryEditor from './QueryEditor.svelte';
	import { fadeSlide } from '$lib/transitions/fadeSlide';
	import { getGraphContext, type GraphService } from './BasicGraph.svelte';
	import { get } from 'svelte/store';

	let optionsStore: GraphOptions['optionsStore'] | undefined;
	let isFilterBarOpen: boolean = true;

	onMount(async () => {});

	$: if ($filterStore.graphOptions) {
		optionsStore = $filterStore.graphOptions.optionsStore;
	}

	function onTableSelect(evt: TableSelectionEvent) {
		const { buildInTables, externalTables } = evt.detail;
		if (buildInTables) {
			filterStore.selectBuildInTables(
				buildInTables.dataset,
				buildInTables.paths.map((option) => option.value)
			);
		}

		if (externalTables && externalTables.fileList) {
			filterStore.selectTablesFromFiles(externalTables.fileList);
		}

		if (externalTables && externalTables.url) {
			filterStore.selectTableFromURL(externalTables.url);
		}
	}

	function onDatasetSelect(evt: DatasetSelectionEvent) {
		filterStore.selectDataset(evt.detail);
	}

	function toggleFilterBar() {
		isFilterBarOpen = !isFilterBarOpen;
	}

	function canvasFilledRegionBounds(ctx: WebGL2RenderingContext | WebGLRenderingContext) {
		const pixels = new Uint8ClampedArray(ctx.drawingBufferWidth * ctx.drawingBufferHeight * 4);

		ctx.readPixels(
			0,
			0,
			ctx.drawingBufferWidth,
			ctx.drawingBufferHeight,
			ctx.RGBA,
			ctx.UNSIGNED_BYTE,
			pixels
		);

		let pixelCount = pixels.length;
		let bound = {
			top: -1,
			left: -1,
			right: -1,
			bottom: -1
		};
		let x = 0;
		let y = 0;
		for (let i = 0; i < pixelCount; i += 4) {
			if (pixels[i + 3] !== 0) {
				x = (i / 4) % ctx.drawingBufferWidth;
				y = ~~(i / 4 / ctx.drawingBufferWidth);
				if (bound.top === -1) {
					bound.top = y;
				}
				if (bound.left === -1) {
					bound.left = x;
				} else if (x < bound.left) {
					bound.left = x;
				}
				if (bound.right === -1) {
					bound.right = x;
				} else if (bound.right < x) {
					bound.right = x;
				}
				if (bound.bottom === -1) {
					bound.bottom = y;
				} else if (bound.bottom < y) {
					bound.bottom = y;
				}
			}
		}

		return bound;
	}

	function drawCanvasToCanvas(
		srcCtx: WebGL2RenderingContext | WebGLRenderingContext,
		dstCtx: CanvasRenderingContext2D,
		bound: ReturnType<typeof canvasFilledRegionBounds>
	) {
		dstCtx.drawImage(
			srcCtx.canvas,
			-bound.left,
			-(srcCtx.drawingBufferHeight - bound.bottom), // canvas2d is inverted compared to pixels of canvas 3d
			srcCtx.drawingBufferWidth,
			srcCtx.drawingBufferHeight
		);
	}

	function captureScreenshot(backgroundFill?: string | CanvasGradient | CanvasPattern) {
		const canvas = document.getElementById('basic-graph') as HTMLCanvasElement;
		if (canvas) {
			const copyCtx = document.createElement('canvas').getContext('2d');
			if (!copyCtx) {
				return;
			}
			// FIXME: should be linked to THREEJS otherwise ctx ID might differ
			// resulting in invalid screenshots
			const originalCtx = canvas.getContext('webgl2');
			if (!originalCtx) {
				return;
			}
			const bound = canvasFilledRegionBounds(originalCtx);
			let trimHeight = bound.bottom - bound.top,
				trimWidth = bound.right - bound.left;

			copyCtx.canvas.width = trimWidth;
			copyCtx.canvas.height = trimHeight;
			if (backgroundFill) {
				copyCtx.fillStyle = backgroundFill;
				copyCtx.fillRect(0, 0, copyCtx.canvas.width, copyCtx.canvas.height);
			}
			drawCanvasToCanvas(originalCtx, copyCtx, bound);
			const imgData = copyCtx.canvas.toDataURL('image/png');

			let link = document.createElement('a');
			link.href = imgData;

			const state = get(filterStore);
			let imageName = 'screenshot';
			if (state.graphOptions) {
				imageName = state.graphOptions.description() ?? imageName;
			}

			link.download = `${imageName}.png`;
			link.click();
		}
	}
</script>

<div class="absolute right-4 pt-4 t-0 top-0 w-96 max-h-full overflow-y-auto">
	<div class="mb-4 gap-3 flex justify-end mr-1">
		<Button size={ButtonSize.LG} color={ButtonColor.SECONDARY} on:click={() => captureScreenshot()}>
			<div class="py">
				<CameraIcon size="20" />
			</div>
		</Button>
		<Button
			size={ButtonSize.LG}
			color={ButtonColor.SECONDARY}
			on:click={settingsStore.toggleThemeMode}
		>
			<div class="py">
				{#if $settingsStore.theme === Theme.Dark}
					<MoonIcon size="20" />
				{:else}
					<SunIcon size="20" />
				{/if}
			</div>
		</Button>
		<Dialog size={DialogSize.large}>
			<Button slot="trigger" color={ButtonColor.SECONDARY} size={ButtonSize.LG}>
				<InfoIcon slot="leading" size="20" />
				SQL Editor
			</Button>
			<svelte:fragment slot="title">SQL Query Editor</svelte:fragment>
			<QueryEditor />
		</Dialog>
		<Button
			size={ButtonSize.LG}
			color={isFilterBarOpen ? ButtonColor.PRIMARY : ButtonColor.SECONDARY}
			on:click={toggleFilterBar}
		>
			<div class="py">
				<SettingsIcon size="20" />
			</div>
		</Button>
	</div>
	{#if isFilterBarOpen}
		<div transition:fadeSlide={{ duration: 100 }}>
			<Card>
				<div class="flex justify-between items-center">
					<h3 class="font-semibold text-lg">Loaded table</h3>
					<Button size={ButtonSize.SM} on:click={filterStore.reset}>
						<svelte:fragment slot="trailing">
							<RefreshCcwIcon size="12" />
						</svelte:fragment>
						Reset</Button
					>
				</div>
				<ul>
					{#each Object.entries($dataStore.tables) as [tableName, table]}
						<li class="flex py-1 justify-between items-center">
							<div>{table.displayName ?? table.name}</div>
							<Button
								on:click={() => filterStore.removeTable(tableName)}
								variant={ButtonVariant.LINK}
								size={ButtonSize.SM}><XIcon size="15" /></Button
							>
						</li>
					{/each}
				</ul>
				<Dialog size={DialogSize.small}>
					<Button slot="trigger" size={ButtonSize.SM}>
						<svelte:fragment slot="trailing">
							<PlusIcon size="12" />
						</svelte:fragment>
						Load More</Button
					>
					{@const dialogCtx = getDialogContext()}
					<TableSelection
						on:selectTable={(selection) => {
							onTableSelect(selection);
							dialogCtx.close();
						}}
						on:selectDataset={onDatasetSelect}
					/>
				</Dialog>
				{#if Object.keys($dataStore.tables).length > 0}
					<Divider />
					<h3 class="font-semibold text-lg mb-2">Graph Type</h3>
					{#each Object.values(GraphType) as graphType}
						<Button
							color={graphType === $filterStore.graphOptions?.getType()
								? ButtonColor.PRIMARY
								: ButtonColor.SECONDARY}
							on:click={() => filterStore.selectGraphType(graphType)}
						>
							<div class="flex gap-2 flex-col items-center">
								<LayersIcon />
								<p class="text-sm">{graphType}</p>
							</div>
						</Button>
					{/each}
					{#if optionsStore && $filterStore.graphOptions}
						<Divider />
						<h3 class="font-semibold text-lg">Visualization options</h3>
						<div class="flex flex-col gap-2">
							<div class="mb-4">
								{#each Object.entries($filterStore.graphOptions.filterOptions ?? {}) as [key, value]}
									{#if typeof value !== 'undefined'}
										<OptionRenderer
											onValueChange={$filterStore.graphOptions.setFilterOption}
											option={value}
											state={$optionsStore}
											{key}
										/>
									{/if}
								{/each}
							</div>
							<Button color={ButtonColor.SECONDARY}>Reset</Button>
						</div>
					{/if}
				{/if}
			</Card>
		</div>
	{/if}
</div>
