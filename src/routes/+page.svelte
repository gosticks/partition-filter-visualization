<script lang="ts">
	import Papa from 'papaparse';
	import type { ParseResult } from 'papaparse';
	import type { PageServerData } from './$types';
	import type { DataEntry, EntryDefinition, FilterEntry } from './proxy+page.server';
	import Button from '$lib/components/Button.svelte';
	import DropdownSelect from '$lib/components/DropdownSelect.svelte';
	import BasicGraph from '$lib/components/BasicGraph.svelte';
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';

	export let isLoading = false;

	export let data: PageServerData;
	let numberOfElementsOptions: string[] = [];

	// TODO: either generate or manually write types for csv data
	type CsvData = object;

	let selectedFilters: FilterEntry[] | undefined = [];
	let selectedNumberOfElements: string | undefined = undefined;
	// List of possible test sizes (e.g. 10, 100, 1000, 10000)

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

	let filterPromise: Promise<Papa.ParseResult<object>[]> | undefined = undefined;
	// TODO: type info values
	let infoPromise: Promise<any> | undefined = undefined;

	function applyFilters() {
		isLoading = true;

		// Load all CSV files matching the selected filters
		if (selectedFilters === undefined || selectedNumberOfElements === undefined) {
			// FIXME: add error handling
			alert('Please select a filter and number of elements');
			isLoading = false;
			return;
		}

		const csvFiles = selectedFilters.map((f) =>
			f.entries.find((e) => e.name.includes(selectedNumberOfElements!))
		);

		console.log(csvFiles);

		filterPromise = Promise.all(csvFiles.map((f) => fetchAndParseCSV(f!.dataUrl)));
		filterPromise?.finally(() => (isLoading = false));

		// Load info files
		infoPromise = Promise.all(csvFiles.map((f) => fetch(f!.infoUrl).then((r) => r.json())));
	}

	function onFilterSelect(selected: FilterEntry[]) {
		selectedFilters = selected;

		if (selected.length === 0) {
			numberOfElementsOptions = [];
			return;
		}

		const regex = /\b(\d+(?:\.\d+)?(?:M|K))\b/g;

		// Construct list of possible element counts based on union between all tests
		const numberOfElements = selected.map((f) => f.entries.map((e) => e.name.match(regex)?.[0]));

		// FIXME: this is just a placeholder for now
		// filter out duplicates
		const uniqueElements = numberOfElements
			.reduce((acc, val) => acc.concat(val), [])
			.filter((v, i, a) => a.indexOf(v) === i);

		// Find overlapping elements in all selected filters
		// const overlappingElements = uniqueElements.reduce((acc, val) =>
		// 	acc.filter((v) => val.includes(v))
		// );

		console.log(uniqueElements);

		numberOfElementsOptions = uniqueElements as string[];
	}
</script>

<div class="">
	<div class="flex items-center gap-4">
		<DropdownSelect
			label="Filters"
			onSelect={onFilterSelect}
			options={Object.entries(data.filters).map(([key, value]) => ({
				label: key,
				value: value
			}))}
		/>
		<DropdownSelect
			label="Number of elements {numberOfElementsOptions.length}"
			singular
			disabled={numberOfElementsOptions.length === 0}
			onSelect={(selected) => {
				selectedNumberOfElements = selected[0];
			}}
			options={numberOfElementsOptions.map((value) => ({
				label: value.toString(),
				value: value
			}))}
		/>
		<!-- Add spacer -->
		<div class="flex-grow" />
		<Button color="primary" size="lg" on:click={applyFilters}>Update</Button>
	</div>
	<div class="border-t-2 mt-6">
		<!-- {#if selectedItem}
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
		{/if} -->
		<div class="lg:flex w-full">
			<div class="flex-grow flex-shrink">
				<BasicGraph
					data={[
						[2, 3, 4, 5, 6, 7],
						[20, 2, 3, 4, 5, 6],
						[20, 2, 3, 4, 5, 6],
						[3, 4, 5, 6, 7, 8],
						[20, 2, 3, 4, 5, 6]
					]}
				/>
			</div>
			<div class="w-96 pt-4 flex-grow-0">
				<div class="mb-4 p-4 text-left rounded-2xl border-secondary-200 bg-white border shadow-xl">
					<h2 class="font-bold mb-2">CSV Info</h2>

					{#if filterPromise === undefined}
						<div>Please select a filter and number of elements</div>
					{:else}
						{#await filterPromise}
							<div>loading...</div>
						{:then results}
							<p>Loaded Tables: {results.length}</p>
							<p>
								Total Number of parsed rows: {results.reduce(
									(acc, val) => acc + val.data.length,
									0
								)}
							</p>
						{:catch error}
							<pre>{JSON.stringify(error)}</pre>
						{/await}
					{/if}
				</div>
				{#if filterPromise !== undefined}
					{#await infoPromise}
						<div class="mb-4 p-4 rounded-2xl border-secondary-200 bg-white border shadow-xl">
							<div>loading...</div>
						</div>
					{:then results}
						{#each results as result}
							<div class="mb-4 p-4 rounded-2xl border-secondary-200 bg-white border shadow-xl">
								<h2 class="font-bold mb-2">{result.name}</h2>
								<pre
									class="w-full bg-secondary-100 p-2 rounded-xl overflow-scroll max-h-60">{JSON.stringify(
										result,
										null,
										2
									)}</pre>
							</div>
						{/each}
					{:catch error}
						<pre>{JSON.stringify(error)}</pre>
					{/await}
				{/if}
			</div>
		</div>

		{#if isLoading}
			<LoadingOverlay isLoading={true} />
		{/if}
	</div>
</div>

<style>
	.side {
		flex: 0 0 500px;
	}
</style>
