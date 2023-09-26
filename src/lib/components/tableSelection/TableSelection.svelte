<script lang="ts" context="module">
	import type { FilterEntry } from '$routes/graph/+page.server';

	export type TableSelectionEvent = CustomEvent<{
		buildInTables?: {
			label: string;
			value: FilterEntry;
		}[];
		externalTables?: {
			fileList?: FileList;
			url?: URL;
		};
	}>;
</script>

<script lang="ts">
	import { dataStore } from '$lib/store/dataStore/DataStore';
	import filterStore from '$lib/store/filterStore/FilterStore';
	import type { IFilterStore } from '$lib/store/filterStore/types';
	import { createEventDispatcher } from 'svelte';
	import DropZone from '../DropZone.svelte';
	import DropdownSelect from '../DropdownSelect.svelte';
	import Divider from '../base/Divider.svelte';
	import Button from '../button/Button.svelte';

	interface $$Events {
		select: TableSelectionEvent;
	}

	var urlInput: string | undefined = undefined;
	var options: IFilterStore['preloadedTables'];
	const dispatch = createEventDispatcher();

	function onSelectTable(
		evt: CustomEvent<{ selected: { label: string; value: FilterEntry }[]; meta?: unknown }>
	) {
		const selectedTables = $filterStore.preloadedTables.filter(
			(option) => option.value === evt.detail.selected[0].value
		);

		dispatch('select', {
			buildInTables: selectedTables
		});
	}

	function filesDropped(files: FileList) {
		dispatch('select', {
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
		console.log('URL selected:', url);
		dispatch('select', {
			externalTables: {
				url
			}
		});
	}

	$: options = $filterStore.preloadedTables.filter(
		(option) =>
			Object.keys($dataStore.tables).findIndex((name) => name === option.value.name) === -1
	);
</script>

<h2 class="text-2xl font-bold mb-5">Please select filter family</h2>
<p class="mb-2">from filter data provided by us</p>
<DropdownSelect on:select={onSelectTable} {options} />
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
