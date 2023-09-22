<script lang="ts">
	import { dataStore } from '$lib/store/dataStore/DataStore';
	import filterStore from '$lib/store/filterStore/FilterStore';
	import settingsStore, { Theme } from '$lib/store/SettingsStore';
	import { onMount } from 'svelte';
	import Button from './button/Button.svelte';
	import Card from './Card.svelte';
	import { get } from 'svelte/store';
	import { GraphOptions, GraphType } from '$lib/store/filterStore/types';
	import OptionRenderer from './OptionRenderer.svelte';
	import Divider from './base/Divider.svelte';
	import {
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
	import Dialog from './Dialog.svelte';
	import TableSelection from './TableSelection.svelte';
	import QueryEditor from './QueryEditor.svelte';

	let optionsStore: GraphOptions['optionsStore'] | undefined;
	let isFilterBarOpen: boolean = true;

	const applyFilter = () => {
		// TODO: validate filter options
		// filterStore.setGraphOptions(filterOptions);
	};

	onMount(async () => {
		// load initial options from store
		const values = get(filterStore);
		console.log('filterStore', values);
		// If present load initial values
		// if (values.graphOptions) {
		// 	filterOptions = values.graphOptions.getCurrentOptions();
		// }

		// filterStore.subscribe((value) => {
		// 	if (value.graphOptions) {
		// 		filterOptions = { ...value.graphOptions.getCurrentOptions() };
		// 	}
		// });
	});

	$: if ($filterStore.graphOptions) {
		optionsStore = $filterStore.graphOptions.optionsStore;
	}

	function fadeSlide(node: HTMLElement, options?: { duration?: number }) {
		return {
			duration: options?.duration || 100,
			css: (t: number) => `
				transform: translateY(${(1 - t) * -20}px) scale(${0.9 + t * 0.1});
                opacity: ${t};
			`
		};
	}

	function _toggleFilterBar() {
		isFilterBarOpen = !isFilterBarOpen;
	}
</script>

<div class="absolute right-4 pt-4 t-0 top-0 w-96 max-h-full overflow-y-auto">
	<div class="mb-4 gap-3 flex justify-end mr-1">
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
		<Dialog size={'large'}>
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
			on:click={_toggleFilterBar}
		>
			<div class="py">
				<SettingsIcon size="20" />
			</div>
		</Button>
	</div>
	{#if isFilterBarOpen}
		<div transition:fadeSlide={{ duration: 100 }}>
			<!-- <Card>Available preloaded tables {$filterStore.preloadedTables.length}</Card> -->
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
							<div>{tableName}</div>
							<Button variant={ButtonVariant.LINK} size={ButtonSize.SM}><XIcon size="15" /></Button>
						</li>
					{/each}
				</ul>
				<Dialog size="small">
					<Button slot="trigger" size={ButtonSize.SM}>
						<svelte:fragment slot="trailing">
							<PlusIcon size="12" />
						</svelte:fragment>
						Load More</Button
					>

					<TableSelection />
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
							<!-- {#if typeof $dataStore.combinedSchema['mode'] !== 'undefined'}
				<DropdownSelect
					label="Groupings"
					singular
					onSelect={(selected) => {
						filterOptions['mode'] = selected.length > 0 ? selected[0] : undefined;
					}}
					options={$dataStore.combinedSchema['mode'].options.map((entry) => ({
						label: entry,
						value: entry
					}))}
				/>
			{/if} -->
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
							<Button color="secondary" on:click={applyFilter}>Reset</Button>
						</div>
					{/if}
				{/if}
			</Card>
		</div>
	{/if}
</div>
