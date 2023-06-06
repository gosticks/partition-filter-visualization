<script lang="ts">
	import type { PageServerData } from './$types';
	import type { DataEntry, EntryDefinition } from './proxy+page.server';
	export let data: PageServerData;

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
			content: fetch(item.dataUrl).then((r) => r.text())
		};

		selectedItem = entry;
	}
</script>

<ul>
	{#each data.data as item}
		<li>
			<button class:selected={item.name === selectedItem?.name} on:click={() => selectItem(item)}
				>{item.name}</button
			>
		</li>
	{/each}
</ul>

{#if selectedItem}
	<h2>{selectedItem.name}</h2>
	{#await selectedItem.content}
		<div>loading...</div>
	{:then content}
		<pre>{content}</pre>
	{/await}
{/if}

<style>
	.selected {
		color: hotpink;
		font-weight: bold;
	}
</style>
