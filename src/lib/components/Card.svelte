<script lang="ts">
	export let title: string = '';
</script>

<div class="mb-4 p-4 text-left rounded-2xl border-secondary-300 bg-white border shadow-lg">
	{#if title !== ''}<h2 class="font-bold mb-2">{title}</h2>{/if}
	<slot />
</div>
