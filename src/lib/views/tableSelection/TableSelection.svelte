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
	import DropZone from '$lib/components/DropZone.svelte';
	import Input from '$lib/components/Input.svelte';
	import DropdownSelect, {
		type DropdownSelectionEvent,
		type Option,
		type OptionConstructor
	} from '$lib/components/DropdownSelect.svelte';
	import Divider from '$lib/components/base/Divider.svelte';
	import Button from '$lib/components/button/Button.svelte';
	// FIXME: add new alias for types
	import type { Dataset, DatasetItem } from '../../../dataset/types';

	interface $$Events {
		selectDataset: DatasetSelectionEvent;
		selectTable: TableSelectionEvent;
	}

	var urlInput: string | undefined = undefined;
	const dispatch = createEventDispatcher();

	var selectedDataset: Dataset | undefined = undefined;

	function onSelectDataset(evt: DropdownSelectionEvent<Dataset>) {
		const selectedDatasets =
			evt.detail.selected.length > 0 &&
			$filterStore.preloadedDatasets.filter((option) => option === evt.detail.selected[0].value);

		if (!selectedDatasets || selectedDatasets.length === 0) {
			dispatch('selectDataset');
			selectedDataset = undefined;
		} else {
			dispatch('selectDataset', selectedDatasets[0]);
			selectedDataset = selectedDatasets[0];
		}
	}

	function onSelectTable(evt: DropdownSelectionEvent<DatasetItem>) {
		console.log('Table selected', evt, selectedDataset);
		dispatch('selectTable', {
			buildInTables: {
				dataset: selectedDataset!,
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
			initiallySelected: value === selectedDataset
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
		disabled={!selectedDataset}
		label="Table"
		expand
		on:select={onSelectTable}
		optionConstructor={tableOptionConstructor}
		values={selectedDataset?.items ?? []}
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
	<Input bind:value={urlInput} type="url" placeholder="URL" class="" />
	<Button>Load</Button>
</form>
