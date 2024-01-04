<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	import CodeEditor from '$lib/components/CodeEditor.svelte';
	import type { editor } from 'monaco-editor';
	import Button from '$lib/components/button/Button.svelte';
	import { dataStore } from '$lib/store/dataStore/DataStore';
	import { ButtonColor } from '$lib/components/button/type';
	import DropdownSelect, {
		type DropdownSelectionEvent,
		type OptionConstructor
	} from '$lib/components/DropdownSelect.svelte';
	import type { DbQueryHistoryItem } from '$lib/store/dataStore/types';
	import Tag from '$lib/components/base/Tag.svelte';

	let currentQuery: ReturnType<typeof dataStore.executeQuery> | undefined = undefined;

	let editor: editor.IStandaloneCodeEditor;

	export let storageKey = 'query-editor';
	export let initialQuery = '';

	onMount(() => {
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

	const historyOptionConstructor: OptionConstructor<DbQueryHistoryItem, DbQueryHistoryItem> = (
		value,
		index,
		meta
	) => {
		return {
			label: value.query,
			value: value,
			id: index
		};
	};

	const onHistoryItemSelected = (item: DropdownSelectionEvent<DbQueryHistoryItem>) => {
		if (item.detail.selected.length === 0) {
			return;
		}
		editor.setValue(item.detail.selected[0].value.query);
	};
</script>

<div>
	<div class="grid grid-cols-6 max-h-full">
		<div class="col-span-3">
			<div>
				<h3 class="font-semibold text-lg mb-3">Query</h3>
				<p class="flex gap-2 mb-2">
					Tables:
					{#each Object.values($dataStore.tables) as table}
						<Tag>{table.tableName}</Tag>
					{/each}
				</p>
			</div>
			<div class="border border-background-100 dark:border-background-800">
				<CodeEditor bind:editor class="h-[60vh] w-full" />
				<DropdownSelect
					label="Query History"
					expand
					singular
					values={$dataStore.previousQueries}
					optionConstructor={historyOptionConstructor}
					on:select={onHistoryItemSelected}
				/>
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
											{@const row = data.get(0)}
											<th class="px-4 py-2"
												>{field.name} [{typeof row?.[field.name]}] [{field.type}]</th
											>
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
		<Button color={ButtonColor.PRIMARY} on:click={onExecute}>Execute</Button>
	</div>
</div>
