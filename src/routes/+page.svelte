<script lang="ts">
	import GridBackground from '$lib/components/GridBackground.svelte';
	import MessageCard from '$lib/components/MessageCard.svelte';
	import TableSelection from '$lib/components/tableSelection/TableSelection.svelte';
</script>

<GridBackground />
<div class="relative h-screen flex flex-col gap-10 justify-center items-center">
	<MessageCard>
		<TableSelection />
	</MessageCard>
</div>
