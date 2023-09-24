<script lang="ts">
	import { dataStore } from '$lib/store/dataStore/DataStore';
	import filterStore from '$lib/store/filterStore/FilterStore';
	import type { IFilterStore } from '$lib/store/filterStore/types';
	import { createEventDispatcher } from 'svelte';
	import type { FilterEntry } from '../../../routes/graph/proxy+page.server';
	import DropZone from '../DropZone.svelte';
	import DropdownSelect from '../DropdownSelect.svelte';
	import Divider from '../base/Divider.svelte';
	import type { TableSelectionEvent } from './types';

	interface $$Events {
		select: TableSelectionEvent;
	}

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
