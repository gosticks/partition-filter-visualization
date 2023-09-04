<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	import CodeEditor from './CodeEditor.svelte';
	import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
	import type { editor } from 'monaco-editor';
	import Button from './Button.svelte';
	import { dataStore } from '$lib/store/dataStore/DataStore';

	let dbConnection: AsyncDuckDBConnection | undefined = undefined;

	let isLoading: boolean = true;

	let currentQuery: ReturnType<typeof dataStore.executeQuery> | undefined = undefined;

	let editor: editor.IStandaloneCodeEditor;

	export let storageKey = 'query-editor';
	export let initialQuery = '';

	onMount(async () => {
		// Reload query if it was saved in the store
		initialQuery = sessionStorage.getItem(storageKey) || initialQuery;

		editor?.setValue(initialQuery);
	});

	onDestroy(() => {});

	function onExecute() {
		// Reset last query

		const value = editor.getValue();

		// Store query in session storage
		sessionStorage.setItem(storageKey, value);

		try {
			currentQuery = dataStore.executeQuery(value);
		} catch (error) {
			console.error(error);
			currentQuery = Promise.reject(error);
		}
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
						{#if data !== undefined}
							<table
								class="table-auto w-full border-collapse border border-gray-300 dark:border-gray-950"
							>
								<thead class="bg-gray-200 dark:bg-gray-600">
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
										<tr
											class={i % 2 === 0
												? 'dark:bg-background-800 bg-white'
												: 'dark:bg-background-900 bg-gray-100'}
										>
											<td class="px-4 py-2">{i}</td>
											{#each { length: numFields } as _, fieldIndex}
												<td class="px-4 py-2">{row?.[data.schema.fields[fieldIndex].name] ?? ''}</td
												>
											{/each}
										</tr>
									{/each}
								</tbody>
							</table>
						{:else}
							<div class="text-red-500">No data</div>
						{/if}
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
</div>
