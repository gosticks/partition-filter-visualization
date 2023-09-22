<script lang="ts">
	import { dataStore } from '$lib/store/dataStore/DataStore';
	import filterStore from '$lib/store/filterStore/FilterStore';
	import type { FilterEntry } from '../../routes/graph/proxy+page.server';
	import DropZone from './DropZone.svelte';
	import DropdownSelect from './DropdownSelect.svelte';
	import Divider from './base/Divider.svelte';

	function onSelectTable(selectionOptions: { label: string; value: FilterEntry }[]) {
		const selectedTables = $filterStore.preloadedTables.filter(
			(option) => option.value === selectionOptions[0].value
		);
		filterStore.selectBuildInTables(selectedTables.map((option) => option.value));
	}

	function filesDropped(files: FileList) {
		dataStore.loadEntriesFromFileList(files);
	}
</script>

<h2 class="text-2xl font-bold mb-5">Please select filter family</h2>
<p class="mb-2">from filter data provided by us</p>
<DropdownSelect onSelect={onSelectTable} options={$filterStore.preloadedTables} />
<div class="flex mt-5 mb-5 items-center justify-center">
	<Divider />
	<div class="mx-4 opacity-50">OR</div>
	<Divider />
</div>
<p class="mb-2">your own dataset in CSV format</p>
<DropZone onFileDropped={filesDropped} />
