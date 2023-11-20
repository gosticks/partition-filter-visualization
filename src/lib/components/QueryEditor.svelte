<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	import CodeEditor from './CodeEditor.svelte';
	import type { editor } from 'monaco-editor';
	import Button from './button/Button.svelte';
	import { dataStore } from '$lib/store/dataStore/DataStore';
	import { ButtonColor } from './button/type';

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
		} finally {
		}
	}

	$: if (editor) {
		editor.layout();
		editor.setValue(initialQuery);
	}
</script>

<div>
	<div class="grid grid-cols-8 max-h-full">
		<div class="col-span-3">
			<h3 class="font-semibold text-lg mb-3">Query</h3>
			<div class="border border-background-100 dark:border-background-800">
				<CodeEditor bind:editor class="h-[60vh] w-full" />
			</div>
		</div>
		<div class="col-span-3">
			<h3 class="font-semibold text-lg mb-3">Output</h3>
			<div
				class="h-[60vh] overflow-auto border-t border-b border-r border-background-100 dark:border-background-800"
				style="font-family: monospace;"
			>
				{#if currentQuery}
					{#await currentQuery then data}
						{#if data !== undefined}
							<table class="table-auto w-full border-collapse">
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
		<div class="col-span-2">
			<h3 class="font-semibold text-lg mb-3">History</h3>
			<div class="h-[60vh] overflow-scroll">
				{#each $dataStore.previousQueries as entry}
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<div
						class="relative border-background-100 dark:border-background-800 border-b select-none cursor-pointer first:border-t py-2 px-2 hover:text-background-900 text-background-500 hover:bg-background-100 dark:hover:bg-background-600"
						style="font-family: monospace;"
						on:click={() => {
							editor.setValue(entry.query);
						}}
					>
						<p class="line-clamp-2 overflow-ellipsis">
							{entry.query}
						</p>
						<div
							class="absolute right-2 bottom-2 text-sm bg-cyan-500 text-cyan-200 px-2 rounded-lg"
							class:bg-red-600={!entry.success}
							class:text-red-100={!entry.success}
						>
							{entry.executionTime.toLocaleString()}ms
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
	<div class="flex justify-end pt-5">
		<Button color={ButtonColor.PRIMARY} on:click={onExecute}>Execute</Button>
	</div>
</div>
