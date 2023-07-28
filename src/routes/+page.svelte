<script lang="ts">
	import Papa from 'papaparse';
	import type { PageServerData } from './$types';
	import type { DataEntry, EntryDefinition, FilterEntry } from './proxy+page.server';
	import Button from '$lib/components/Button.svelte';
	import DropdownSelect from '$lib/components/DropdownSelect.svelte';
	import BasicGraph from '$lib/components/BasicGraph.svelte';
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';
	import type { Vector2 } from 'three';
	import { useDataStore } from '../store/DataStore';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';

	export let isLoading = true;

	export let data: PageServerData;
	let numberOfElementsOptions: string[] = [];

	// TODO: either generate or manually write types for csv data
	type CsvData = {
		fpr: number;
		k: number;
		size: number;
		n_threads: number;
		n_partitions: number;
		n_elements_build: number;
		n_elements_lookup: number;
		shared_elements: number;
		name: string;
		fixture: string;
		s: number;
		duration: number;
		split_name: string[];
	};

	let selectedFilters: FilterEntry[] | undefined = [];
	let selectedNumberOfElements: string | undefined = undefined;
	// List of possible test sizes (e.g. 10, 100, 1000, 10000)

	let filterData: number[][][] = [
		[
			[2, 3, 4, 5, 6, 7],
			[20, 2, 3, 4, 50, 6],
			[20, 2, 3, 4, 5, 6],
			[3, 4, 5, 6, 7, 8],
			[20, 2, 3, 4, 5, 6]
		],
		[
			[2, 3, 4, 5, 6, 7],
			[20, 2, 3, 4, 50, 6],
			[20, 2, 3, 4, 5, 6],
			[3, 4, 5, 6, 7, 8],
			[20, 2, 3, 4, 5, 6]
		],
		[[], [20, 2, 3, 4, 5, 6], [20, 2, 3, 4, 5, 6], [3, 4, 5, 6, 7, 8], [20, 2, 3, 4, 5, 6]]
	];

	let db = useDataStore();
	let dbConnection: AsyncDuckDBConnection | undefined = undefined;
	onMount(() => {
		if (!browser) {
			return;
		}

		db.subscribe((dbInstance) => {
			if (!dbInstance) {
				dbConnection = undefined;
				return;
			}

			dbInstance
				.connect()
				.then((connection) => {
					console.log('Connected to DB');
					dbConnection = connection;
					isLoading = false;
				})
				.catch((e) => {
					console.error('Failed to connect to DB', e);
					dbConnection = undefined;
				});
		});
	});

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
					// TODO: cleanup into a separate parser function
					if (results.errors.length > 0) {
						console.error(results.errors);
						reject(results.errors);
						return;
					}

					// FIXME: use generated types
					results.data.forEach((row: any) => {
						// console.log(d);
						row['split_name'] = row['name'].split('/')[0].split('_');

						row['k'] = parseInt(row['split_name'][row['split_name'].length - 1], 10);
						row['fixture'] = row['name'].split('/')[1];
						row['s'] = parseFloat(row['name'].split('/')[2]) / 100;
						row['n_threads'] = parseInt(row['name'].split('/')[3], 10);
						row['n_partitions'] = parseInt(row['name'].split('/')[4], 10);
						row['n_elements_build'] = parseInt(row['name'].split('/')[5], 10);
						row['n_elements_lookup'] = parseInt(row['name'].split('/')[6], 10);
						row['shared_elements'] = parseFloat(row['name'].split('/')[7]) / 100;
						row['name'] = row['split_name'].slice(0, row['split_name'].length - 1).join('_');
					});

					// Analyze data
					results.errors.length > 0 ? reject(results.errors) : resolve(results);
				}
			});
		});
		return promise;
	}

	let hoverPosition: Vector2 | undefined = undefined;
	let filterPromise: Promise<Papa.ParseResult<CsvData>[]> | undefined = undefined;
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

		// console.log(csvFiles);

		// let dbLoadPromise = Promise.all(
		// 	csvFiles.map((f) =>
		// 		dbConnection?.insertCSVFromPath(new URL(f!.dataUrl, location.href).href, {
		// 			name: f!.filterName,
		// 			detect: true
		// 		})
		// 	)
		// );

		// dbLoadPromise
		// 	.then((results) => {
		// 		console.debug('DuckDB loaded tables', results);
		// 		isLoading = false;

		// 		dbConnection?.getTableNames('').then((names) => {
		// 			console.log('Table names', names);
		// 		});
		// 	})
		// 	.catch((e) => {
		// 		console.error('DB load failed:', e);
		// 		isLoading = false;
		// 	});

		filterPromise = Promise.all(csvFiles.map((f) => fetchAndParseCSV(f!.dataUrl)));

		let tempFilterData: any;

		// Prepare data for display when all CSV files are loaded
		filterPromise.then((csvs) => {
			console.log(csvs);

			type ValueGroup = { value: number; rows: CsvData[] };
			// Create a list of all unique sizes and fprs
			const mbSizeGroup: ValueGroup[] = [];
			const fprGroup: ValueGroup[] = [];

			let maxFpr: number = 0.0;
			let maxSize: number = 0;

			const steps = 10;

			// TODO: covnert to single pass
			// Compute range of values for each size and fpr
			csvs.forEach((csv) => {
				csv.data.forEach((row) => {
					maxFpr = Math.max(maxFpr, row.fpr);
					maxSize = Math.max(maxSize, row.size);
				});
			});

			// Create groups for each size and fpr
			for (let i = 0; i < steps; i++) {
				const fpr = i / steps;
				const size = Math.round((i / steps) * maxSize);

				fprGroup.push({ value: fpr, rows: [] });
				mbSizeGroup.push({ value: size, rows: [] });
			}

			const indexForFpr = (fpr: number) => {
				return Math.round((fpr / maxFpr) * (steps - 1));
			};

			// Go over all entries and place them into the correct buckets
			csvs.forEach((csv) => {
				csv.data.forEach((row) => {
					const fprIndex = indexForFpr(row.fpr);
					const sizeIndex = Math.round((row.size / maxSize) * (steps - 1));
					// console.log(fprIndex, sizeIndex);
					// fprGroup[fprIndex].rows.push(row);
					mbSizeGroup[sizeIndex].rows.push(row);
				});
			});

			// Construct a datamap sorting all CSV values by size and fpr\
			console.log(fprGroup, mbSizeGroup);

			tempFilterData = mbSizeGroup.map((size) => {
				let fprArray: number[][] = [];

				// Populate fprArray
				for (let i = 0; i < steps; i++) {
					fprArray.push(
						size.rows
							.filter((row) => {
								const fprIndex = indexForFpr(row.fpr);
								return fprIndex === i;
							})
							.map((row) => (row.n_elements_lookup / row.duration) * 0.0000001)
					);
				}

				return fprArray;
			});

			// csvs.forEach((csv, i) => {
			// 	const filter = selectedFilters![i];
			// const entries = filter.entries.filter((e) => e.name.includes(selectedNumberOfElements!));
		});

		filterPromise?.finally(() => {
			isLoading = false;
			filterData = tempFilterData;
		});

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
				<div>
					<BasicGraph
						data={filterData}
						onHover={(obj, pos) => {
							// hoverPosition = pos;
						}}
						zAxisLabel="Size in Bytes"
						xAxisLabel="False positive rate"
						yAxisLabel="Throughput"
					/>
				</div>
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
		{#if hoverPosition}
			<div class="absolute border-t-2 mt-6" style="left: {hoverPosition.x}; top: {hoverPosition.y}">
				<h2>Hovering over {hoverPosition}</h2>
			</div>
		{/if}
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
