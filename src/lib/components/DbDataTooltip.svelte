<script lang="ts">
	import { dataStore as dbStore } from '$lib/store/dataStore/DataStore';
	import { positionPortal } from '$lib/actions/portal';
	import { draggable } from '$lib/actions/draggable';
	import { ButtonSize, ButtonVariant } from './button/type';
	import { readable, writable } from 'svelte/store';
	import notificationStore from '$lib/store/notificationStore';
	import { fade } from 'svelte/transition';
	import Button from './button/Button.svelte';
	import LoadingOverlay from './LoadingOverlay.svelte';
	import { CopyIcon } from 'svelte-feather-icons';

	export let absolutePosition: { x: number; y: number };
	export let tableName: string;
	export let dbEntryId: number;
	export const itemColor: string | undefined = undefined;
	export let isLocked: boolean = false;

	let selectionInfoPromise: Promise<Record<string, any> | undefined> | undefined;

	const queryData = async (tableName: string, id: number) => {
		return await dbStore.getEntry(tableName, 'id', `${id}`);
	};

	$: dbEntryId, tableName, (selectionInfoPromise = queryData(tableName, dbEntryId));

	const copyValue = (value: string) => {
		navigator.clipboard.writeText(value);
		notificationStore.info({
			message: 'Value copied to clipboard',
			dismissDuration: 1000
		});
	};
</script>

<div
	use:draggable={{ enabled: readable(isLocked) }}
	use:positionPortal={absolutePosition}
	transition:fade={{ duration: 75 }}
	class="absolute rounded-lg backdrop-blur-md border shadow-2xl bg-background-100/95 dark:bg-background-900/95 ring-1 ring-background-900/5 dark:ring-background-950/5"
	class:shadow-lg={isLocked}
	class:border-blue-500={isLocked}
	class:border-2={isLocked}
	style="font-family: monospace;"
>
	<div class="px-3 pt-2">
		<slot />
	</div>
	{#if selectionInfoPromise}
		<hr class="border-slate-700 m-2" />
		<div class="px-3 pb-2 tooltip-content overflow-auto max-h-96 w-sm max-w-screen-sm">
			{#await selectionInfoPromise}
				<div class="h-96 w-full w-xl flex items-center">Loading...</div>
			{:then result}
				{#if result}
					{#each Object.entries(result) as [key, value]}
						<div class="flex gap-2 justify-between">
							<div>
								<Button
									variant={ButtonVariant.LINK}
									on:click={() => copyValue(value)}
									size={ButtonSize.SM}><b class="mr-2">{key}</b><CopyIcon size="12" /></Button
								>
							</div>

							<span class="max-w-xs block overflow-hidden text-ellipsis">{value}</span>
						</div>
					{/each}
				{:else}
					Result empty
				{/if}
			{:catch err}
				Failed to load info {err}
			{/await}
		</div>
	{/if}
</div>

<style lang="scss">
	.tooltip-content {
		// Reset scroll bar styles
		&::-webkit-scrollbar {
			width: 0.4em;
			height: 0.4em;
		}

		&::-webkit-scrollbar-track {
			@apply dark:bg-slate-900 bg-slate-300;
			opacity: 0.05;
		}

		&::-webkit-scrollbar-thumb {
			@apply bg-slate-300 dark:bg-slate-600;
			border-radius: 20px;
		}

		&::-webkit-scrollbar-corner {
			opacity: 0.05;
		}
	}
</style>
