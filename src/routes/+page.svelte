<script lang="ts">
	import Papa from 'papaparse';
	import type { ParseResult } from 'papaparse';
	import Sidebar from '../lib/Sidebar.svelte';
	import type { PageServerData } from './$types';
	import type { DataEntry, EntryDefinition } from './proxy+page.server';
	import { contenteditable_truthy_values } from 'svelte/internal';
	import Button from '$lib/components/Button.svelte';
	import Dropdown from '$lib/components/Dropdown.svelte';
	import DropdownSelect from '$lib/components/DropdownSelect.svelte';
	export let data: PageServerData;

	// TODO: either generate or manually write types for csv data
	type CsvData = object;

	let selectedItem: {
		name: string;
		info: Promise<EntryDefinition>;
		// FIXME: parse content as csv
		content: Promise<any>;
	} | null = null;

	function selectItem(item: DataEntry) {
		// Load content of csv file and info file
		let entry: typeof selectedItem = {
			name: item.name,
			info: fetch(item.infoUrl).then((r) => r.json()),
			content: fetchAndParseCSV(item.dataUrl)
		};

		selectedItem = entry;
	}

	async function fetchAndParseCSV(csvUrl: string) {
		const url = new URL(csvUrl, location.href);

		console.log(url);
		const promise = new Promise<Papa.ParseResult<CsvData>>((resolve, reject) => {
			Papa.parse<CsvData>(url.href, {
				download: true,
				header: true,
				worker: true,
				dynamicTyping: true,
				skipEmptyLines: true,
				complete: function (results) {
					console.log('Finished:', results);
					results.errors.length > 0 ? reject(results.errors) : resolve(results);
				}
			});
		});
		return promise;
	}
</script>

<div class="">
	<div class="flex gap-4">
		<DropdownSelect
			label="Filters"
			onSelect={(selected) => {
				console.log(selected);
				//selectItem(selected);
			}}
			options={Object.entries(data.filters).map(([key, value]) => ({
				label: key,
				value: value
			}))}
		/>
		<DropdownSelect
			label="Number of elements"
			singular
			disabled={true}
			onSelect={(selected) => {
				console.log(selected);
				//selectItem(selected);
			}}
			options={Object.entries(data.filters).map(([key, value]) => ({
				label: key,
				value: value
			}))}
		/>
	</div>
	<div class="border-t-2 mt-6">
		{#if selectedItem}
			<h2>{selectedItem.name}</h2>
			{#await selectedItem.info}
				<div>loading...</div>
			{:then info}
				<pre>{JSON.stringify(info)}</pre>
			{/await}
			{#await selectedItem.content}
				<div>loading...</div>
			{:then content}
				<pre>{JSON.stringify(content.data)}</pre>
			{/await}
		{/if}
	</div>
</div>
