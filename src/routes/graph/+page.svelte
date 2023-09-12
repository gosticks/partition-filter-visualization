<script lang="ts">
	import type { PageServerData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import DropdownSelect from '$lib/components/DropdownSelect.svelte';
	import BasicGraph from '$lib/components/BasicGraph.svelte';
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';
	import type { Vector2 } from 'three';
	import { dataStore } from '$lib/store/dataStore/DataStore';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import Card from '$lib/components/Card.svelte';
	import Dialog from '$lib/components/Dialog.svelte';
	import QueryEditor from '$lib/components/QueryEditor.svelte';
	import FilterSidebar from '$lib/components/FilterSidebar.svelte';
	import GridBackground from '$lib/components/GridBackground.svelte';
	import MessageCard from '$lib/components/MessageCard.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import filterStore, { type IFilterStoreGraphOptions } from '$lib/store/filterStore/FilterStore';

	export let data: PageServerData;

	onMount(async () => {
		if (!browser) return;

		// Pass possible db options to the filter sidebar
		await filterStore.initWithPreloadedTables(data.filters);
	});

	let hoverPosition: Vector2 | undefined = undefined;

	function filesDropped(files: FileList) {
		dataStore.loadEntriesFromFileList(files);
	}

	function onHover(position: Vector2, object?: THREE.Object3D) {
		hoverPosition = position;
	}
</script>

<div>
	<div class="relative">
		<div class="h-screen w-full">
			{#if $filterStore.graphOptions}
				<div class="flex-grow flex-shrink">
					<div class="flex flex-col">
						<BasicGraph dataRenderer={$filterStore.graphOptions.getRenderer()} {onHover} />
					</div>
				</div>
			{:else}
				<!-- <div class="flex-grow flex-shrink">
					<div class="flex flex-col">
						<BasicGraph {onHover} />
					</div>
				</div> -->
				<GridBackground />
			{/if}
			{#if $filterStore.selectedTables.length === 0}
				<div class="h-full w-full flex flex-col gap-10 justify-center items-center">
					<MessageCard>
						<h2 class="text-2xl font-bold mb-5">Please select filter family</h2>
						<p class="mb-2">from filter data provided by us</p>
						<DropdownSelect
							onSelect={(options) => {
								filterStore.selectBuildInTables(options);
							}}
							options={$filterStore.preloadedTables}
						/>
						<div class="flex mt-5 mb-5 items-center justify-center">
							<div class="border-t dark:border-background-700 w-full" />
							<div class="mx-4 opacity-50">OR</div>
							<div class="border-t w-full dark:border-background-700" />
						</div>
						<p class="mb-2">your own dataset in CSV format</p>
						<DropZone onFileDropped={filesDropped} />
					</MessageCard>
				</div>
			{/if}
		</div>
		<FilterSidebar />
		<div class="fixed bottom-5 left-5">
			<Dialog large>
				<Button slot="trigger" color="secondary" size="lg">SQL Editor</Button>
				<svelte:fragment slot="title">SQL Query Editor</svelte:fragment>
				<QueryEditor />
			</Dialog>
		</div>
		{#if $filterStore.selectedPoint && hoverPosition}
			<div
				class="absolute pointer-events-none"
				style={`left: ${hoverPosition.x}px; top: ${hoverPosition.y}px;`}
			>
				<Card>
					<p>{$filterStore.selectedPoint.meta['layer']?.name ?? 'Untitled layer'}</p>
					<div style="font-family: monospace;">
						<p>{$filterStore.selectedPoint.meta['value'] ?? 'NaN'}</p>
						[{$filterStore.selectedPoint.dataPosition.toArray()}]
					</div>
				</Card>
			</div>
		{/if}
		{#if $filterStore.isLoading || $dataStore.isLoading}
			<LoadingOverlay isLoading={true} />
		{/if}
	</div>
</div>
