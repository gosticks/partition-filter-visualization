<script lang="ts" context="module">
	export type DatasetSelectionEvent = CustomEvent<Dataset | undefined>;

	export type TableSelectionEvent = CustomEvent<{
		buildInTables?: {
			dataset: Dataset;
			paths: Option<DatasetItem>[];
		};
		externalTables?: {
			fileList?: FileList;
			url?: URL;
		};
	}>;
</script>

<script lang="ts">
	import filterStore from '$lib/store/filterStore/FilterStore';
	import { createEventDispatcher } from 'svelte';
	import DropZone from '../DropZone.svelte';
	import DropdownSelect, {
		type DropdownSelectionEvent,
		type Option,
		type OptionConstructor
	} from '../DropdownSelect.svelte';
	import Divider from '../base/Divider.svelte';
	import Button from '../button/Button.svelte';
	import type { Dataset, DatasetItem } from '../../../dataset/types';
	import { get } from 'svelte/store';

	interface $$Events {
		selectDataset: DatasetSelectionEvent;
		selectTable: TableSelectionEvent;
	}

	var urlInput: string | undefined = undefined;
	const dispatch = createEventDispatcher();

	function onSelectDataset(evt: DropdownSelectionEvent<Dataset>) {
		const selectedDataset = $filterStore.preloadedDatasets.filter(
			(option) => option === evt.detail.selected[0].value
		);

		if (selectedDataset.length === 0) {
			dispatch('selectDataset');
		} else {
			dispatch('selectDataset', selectedDataset[0]);
		}
	}

	function onSelectTable(evt: DropdownSelectionEvent<DatasetItem>) {
		dispatch('selectTable', {
			buildInTables: {
				dataset: get(filterStore).selectedDataset!,
				paths: evt.detail.selected
			}
		});
	}

	function filesDropped(files: FileList) {
		dispatch('selectTable', {
			externalTables: {
				fileList: files
			}
		});
	}

	function onUrlLoad() {
		if (!urlInput) {
			return;
		}

		const url = new URL(urlInput);
		dispatch('selectTable', {
			externalTables: {
				url
			}
		});
	}

	const datasetOptionConstructor: OptionConstructor<Dataset, Dataset> = (value, index, meta) => {
		return {
			label: value.name,
			value: value,
			id: index,
			initiallySelected: value === get(filterStore).selectedDataset
		};
	};

	const tableOptionConstructor: OptionConstructor<DatasetItem, DatasetItem> = (
		value,
		index,
		meta
	) => {
		return {
			label: value.name,
			value: value,
			id: index
		};
	};
</script>

<h2 class="text-2xl font-bold mb-5">Please select dataset</h2>
<p class="mb-2">from filter data provided by us</p>
<div class="grid grid-cols-2 gap-2">
	<DropdownSelect
		label="Dataset"
		expand
		singular
		on:select={onSelectDataset}
		optionConstructor={datasetOptionConstructor}
		values={$filterStore.preloadedDatasets}
	/>
	<DropdownSelect
		disabled={!$filterStore.selectedDataset}
		label="Table"
		expand
		on:select={onSelectTable}
		optionConstructor={tableOptionConstructor}
		values={$filterStore.selectedDataset?.items ?? []}
	/>
</div>
<!-- <DropdownSelect on:select={onSelectTable} {options} /> -->
<div class="flex mt-5 mb-5 items-center justify-center">
	<Divider />
	<div class="mx-4 opacity-50">OR</div>
	<Divider />
</div>
<p class="mb-2">your own dataset in CSV format</p>
<DropZone onFileDropped={filesDropped} />
<div class="flex mt-5 mb-5 items-center justify-center">
	<Divider />
	<div class="mx-4 opacity-50">OR</div>
	<Divider />
</div>
<p class="mb-2">a CSV dataset from url</p>
<form class="flex gap-2" on:submit={onUrlLoad}>
	<input
		bind:value={urlInput}
		type="url"
		placeholder="URL"
		class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
	/>
	<Button>Load</Button>
</form>
