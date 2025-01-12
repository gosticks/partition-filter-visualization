<script lang="ts">
	import { dataStore } from '$lib/store/dataStore/DataStore';
	import filterStore from '$lib/store/filterStore/FilterStore';
	import settingsStore, { Theme } from '$lib/store/SettingsStore';
	import Button from '$lib/components/button/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import { GraphOptions, GraphType } from '$lib/store/filterStore/types';
	import OptionRenderer from '$lib/components/OptionRenderer.svelte';
	import Divider from '$lib/components/base/Divider.svelte';
	import {
		CameraIcon,
		DatabaseIcon,
		Edit2Icon,
		LayersIcon,
		MoonIcon,
		PlusIcon,
		RefreshCcwIcon,
		SaveIcon,
		SettingsIcon,
		SunIcon,
		XIcon
	} from 'svelte-feather-icons';
	import { ButtonColor, ButtonSize, ButtonVariant } from '$lib/components/button/type';
	import Dialog, { DialogSize, getDialogContext } from '$lib/components/dialog/Dialog.svelte';
	import TableSelection, {
		type TableSelectionEvent
	} from '$lib/views/tableSelection/TableSelection.svelte';
	import QueryEditor from '$lib/views/QueryEditor.svelte';
	import { fadeSlide } from '$lib/transitions/fadeSlide';
	import { get } from 'svelte/store';
	import notificationStore from '$lib/store/notificationStore';
	import { getGraphContext, type GraphService } from '$lib/views/CoreGraph.svelte';
	import { imageFromGlContext } from '$lib/rendering/screenshot';
	import SchemaMapper from './SchemaMapper.svelte';
	import H3 from '$lib/components/base/H3.svelte';
	import EditableText from '$lib/components/EditableText.svelte';

	const graphService: GraphService = getGraphContext();
	let optionsStore: GraphOptions['optionsStore'] | undefined;
	let renderStore: GraphOptions['renderStore'] | undefined;
	let isFilterBarOpen: boolean = true;

	$: if ($filterStore.graphOptions) {
		optionsStore = $filterStore.graphOptions.optionsStore;
		renderStore = $filterStore.graphOptions.renderStore;
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
		const { renderer } = graphService.getValues();
		const srcCtx = renderer.getContext();
		const imgData = imageFromGlContext(srcCtx, backgroundFill);

		if (!imgData) {
			notificationStore.error({
				message: 'Failed to capture screenshot',
				description: 'Image data empty'
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
					z: cameraState.rotation.z
				},
				position: {
					x: cameraState.position.x,
					y: cameraState.position.y,
					z: cameraState.position.z
				}
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

		<Button on:click={copyConfigValue} color={ButtonColor.SECONDARY} size={ButtonSize.LG}>
			<SaveIcon slot="leading" size="20" />
		</Button>
		<Dialog size={DialogSize.large}>
			<Button slot="trigger" color={ButtonColor.SECONDARY} size={ButtonSize.LG}>
				<DatabaseIcon slot="leading" size="20" />
			</Button>
			<svelte:fragment slot="title">SQL Query Editor</svelte:fragment>
			<QueryEditor />
		</Dialog>
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
		<div class="w-full md:w-96" transition:fadeSlide={{ duration: 100 }}>
			<Card class="max-h-[80vh] md:max-h-[70vh] overflow-auto">
				<div class="flex justify-between items-center">
					<H3 class="select-none cursor-pointer">Loaded datasets</H3>
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
							<div class="flex gap-2">
								<span><EditableText value={table.displayName} /></span>
								<Dialog>
									<Button slot="trigger" variant={ButtonVariant.DEFAULT} size={ButtonSize.SM}>
										<Edit2Icon size="15" />
									</Button>

									<SchemaMapper initiallySelectedTable={table} />
								</Dialog>
							</div>
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
					<details open={!$filterStore.graphOptions?.getType()}>
						<summary><H3 class="inline-block select-none cursor-pointer">Graph Type</H3></summary>
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
						<details open>
							<summary><H3 class="inline-block select-none cursor-pointer">Data Query</H3></summary>
							<div class="flex flex-col gap-2">
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
						</details>
						<Divider />
						<details>
							<summary
								><H3 class="inline-block select-none cursor-pointer">Display options</H3></summary
							>
							<div class="flex flex-col gap">
								{#each Object.entries($filterStore.graphOptions.getRenderOptionFields()) as [key, value]}
									{#if typeof value !== 'undefined'}
										<OptionRenderer
											onValueChange={$filterStore.graphOptions.setRenderOption}
											option={value}
											state={$renderStore}
											{key}
										/>
									{/if}
								{/each}
							</div>
						</details>
					{/if}
				{/if}
			</Card>
		</div>
	{/if}
</div>
