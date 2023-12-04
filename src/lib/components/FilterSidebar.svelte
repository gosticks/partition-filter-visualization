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
		CpuIcon,
		InfoIcon,
		LayersIcon,
		MehIcon,
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
	import { get } from 'svelte/store';
	import notificationStore from '$lib/store/notificationStore';
	import { getGraphContext, type GraphService } from './BasicGraph.svelte';
	import { imageFromGlContext } from '$lib/rendering/screenshot';

	const graphService: GraphService = getGraphContext();
	let optionsStore: GraphOptions['optionsStore'] | undefined;
	let isFilterBarOpen: boolean = true;

	$: if ($filterStore.graphOptions) {
		optionsStore = $filterStore.graphOptions.optionsStore;
	}

	function onTableSelect(evt: TableSelectionEvent) {
		const { buildInTables, externalTables } = evt.detail;
		if (buildInTables) {
			filterStore.loadBuildInTables(
				buildInTables.dataset,
				buildInTables.paths.map((option) => option.value)
			);
		}

		if (externalTables && externalTables.fileList) {
			filterStore.loadTablesFromFiles(externalTables.fileList);
		}

		if (externalTables && externalTables.url) {
			filterStore.loadTableFromURL(externalTables.url);
		}
	}

	function toggleFilterBar() {
		isFilterBarOpen = !isFilterBarOpen;
	}

	function captureScreenshot(backgroundFill?: string | CanvasGradient | CanvasPattern) {
		const {renderer} = graphService.getValues();
		const srcCtx = renderer.getContext()
		const imgData = imageFromGlContext(srcCtx, backgroundFill);

		if (!imgData) {
			notificationStore.error({
				message: "Failed to capture screenshot",
				description: "Image data empty"
			});
			return;
		}

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

	const copyConfigValue = () => {
		const cameraState = graphService.getCameraState();
		console.log(JSON.stringify(cameraState));

 		const state = {
			...filterStore.toStateObject(),
			ui: {
				rotation: {
					x: cameraState.rotation.x,
					y: cameraState.rotation.y,
					z: cameraState.rotation.z,
				},
				position: {
					x: cameraState.position.x,
					y: cameraState.position.y,
					z: cameraState.position.z,
				},
			}
		};

		navigator.clipboard.writeText(JSON.stringify(state));
		notificationStore.info({
			message: 'Graph State copied to clipboard',
			dismissDuration: 1000
		});
	};
</script>

<div class="absolute right-4 pt-4 t-0 top-0 max-h-full overflow-y-auto">
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
		<Button on:click={copyConfigValue} color={ButtonColor.SECONDARY} size={ButtonSize.LG}>
			<CpuIcon slot="leading" size="20" />
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
		<div class="w-96" transition:fadeSlide={{ duration: 100 }}>
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
					/>
				</Dialog>
				{#if Object.keys($dataStore.tables).length > 0}
					<Divider />
					<details open={!$filterStore.graphOptions?.getType()}><summary><h3 class="inline font-semibold text-lg mb-2">Graph Type</h3></summary>
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
					</details>
					{#if optionsStore && $filterStore.graphOptions}
						<Divider />
						<details open><summary><h3 class="font-semibold inline-block text-lg">Visualization options</h3></summary>
						<div class="flex flex-col gap-2">
							<div class="mb-4">
								{#each Object.entries($filterStore.graphOptions.filterOptionFields ?? {}) as [key, value]}
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
						</details>
						<Divider />
						<details ><summary><h3 class="font-semibold inline text-lg">Render options</h3>
							<div class="flex flex-col gap-2">
								<div class="mb-4">
									{#each Object.entries($filterStore.graphOptions.getRenderOptionFields()) as [key, value]}
									{#if typeof value !== 'undefined'}
									<OptionRenderer
									onValueChange={$filterStore.graphOptions.setRenderOption}
									option={value}
									state={$optionsStore}
									{key}
									/>
									{/if}
									{/each}
								</div>
								<Button color={ButtonColor.SECONDARY}>Reset</Button>
							</div>
						</summary>
						</details>
					{/if}
				{/if}
			</Card>
		</div>
	{/if}
</div>
