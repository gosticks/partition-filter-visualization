<script lang="ts">
	export let title: string = '';

	let className = '';
	export let noPad = false;
	export { className as class };
</script>

<div
	class:p-4={!noPad}
	class="m-1 mb-4 text-left rounded-xl backdrop-blur-lg bg-background-50/75 dark:bg-background-900/75 ring-1 ring-background-900/5 dark:ring-background-950/5 shadow-lg {className}"
>
	{#if title !== ''}<h2 class:pt-2={noPad} class:px-4={noPad} class="font-bold mb-2">
			{title}
		</h2>{/if}
	<slot />
</div>
