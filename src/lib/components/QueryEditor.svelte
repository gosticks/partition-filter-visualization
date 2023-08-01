<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	import CodeEditor from './CodeEditor.svelte';
	import { useDataStore } from '$lib/store/DataStore';
	import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
	import LoadingOverlay from './LoadingOverlay.svelte';
	import type { editor } from 'monaco-editor';
	import Button from './Button.svelte';

	let dbConnection: AsyncDuckDBConnection | undefined = undefined;

	let isLoading: boolean = true;
	let db = useDataStore();

	let dbUnsubscriber: () => void;

	let currentQuery: ReturnType<AsyncDuckDBConnection['query']> | undefined = undefined;

	let editor: editor.IStandaloneCodeEditor;

	export let storageKey = 'query-editor';
	export let initialQuery = '';

	onMount(async () => {
		isLoading = true;
		// Reload query if it was saved in the store
		initialQuery = sessionStorage.getItem(storageKey) || initialQuery;

		editor?.setValue(initialQuery);

		dbUnsubscriber = db.subscribe((dbInstance) => {
			if (!dbInstance) {
				dbConnection = undefined;
				return;
			}

			dbInstance
				.connect()
				.then((connection) => {
					console.log('Connected to DB');
					dbConnection = connection;
				})
				.catch((e) => {
					console.error('Failed to connect to DB', e);
					dbConnection = undefined;
				})
				.finally(() => {
					isLoading = false;
				});
		});
	});

	onDestroy(() => {
		dbConnection?.close();
		dbConnection = undefined;
		dbUnsubscriber();
	});

	function onExecute() {
		if (!dbConnection) return;
		currentQuery = undefined;
		isLoading = true;

		// Reset last query

		const value = editor.getValue();

		// Store query in session storage
		sessionStorage.setItem(storageKey, value);

		currentQuery = dbConnection
			.query(value)
			.then((result) => {
				console.log(result, result.schema, result.numRows, result.numCols);
				result.numRows;
				return result;
			})
			.catch((e) => {
				console.error(e.message);
				throw e;
			})
			.finally(() => {
				isLoading = false;
			});
	}

	$: if (editor) {
		editor.layout();
		editor.setValue(initialQuery);
	}
</script>

<div>
	<div class="grid grid-cols-2">
		<div class="col-span-1">
			<h3 class="font-semibold text-lg mb-3">Query</h3>
			<CodeEditor bind:editor class="h-[50vh] w-full" />
		</div>
		<div>
			<h3 class="font-semibold text-lg mb-3">Output</h3>
			<div class="h-[50vh] overflow-scroll">
				{#if currentQuery}
					{#await currentQuery then data}
						<table class="table-auto w-full border-collapse border border-gray-300">
							<thead class="bg-gray-200">
								<tr>
									<th class="px-4 py-2">ID</th>
									{#each data.schema.fields as field}
										<th class="px-4 py-2">{field.name}</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each { length: data.numRows } as _, i}
									{@const row = data.get(i)}
									{@const numFields = data.numCols}
									<tr class={i % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
										<td class="px-4 py-2">{i}</td>
										{#each { length: numFields } as _, fieldIndex}
											<td class="px-4 py-2">{row?.[data.schema.fields[fieldIndex].name] ?? ''}</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
						<!-- <pre>{JSON.stringify(data, null, 2)}</pre> -->
					{:catch error}
						<div class="text-red-500">Error: {error.message}</div>
					{/await}
				{/if}
			</div>
		</div>
	</div>
	<div class="flex justify-end pt-5">
		<Button color="primary" on:click={onExecute}>Execute</Button>
	</div>

	{#if isLoading}
		<LoadingOverlay isLoading={true} />
	{/if}
</div>
