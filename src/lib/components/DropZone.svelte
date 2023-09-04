<script lang="ts">
	import { onMount } from 'svelte';

	type DropHandler = (files: FileList) => void;

	export let onFileDropped: DropHandler | undefined = undefined;

	let isDragging = false;

	function handleDragEnter(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;

		const files = event.dataTransfer?.files;
		if (files && files.length > 0 && onFileDropped) {
			onFileDropped(files);
		}
	}
</script>

<div
	class="border-4 rounded-xl p-6 border-background-300 dark:border-background-700 text-center border-dotted"
	class:dragging={isDragging}
	on:dragenter={handleDragEnter}
	on:dragover={handleDragOver}
	on:dragleave={handleDragLeave}
	on:drop={handleDrop}
>
	<span class="text-xl font-semibold text-background-400 dark:text-background-300">
		{#if isDragging}
			<span>Drop the files here</span>
		{:else}
			<span>Drag and drop files here <br /> or <br /> click to select</span>
		{/if}
	</span>
</div>

<style lang="scss">
	.dragging {
		border-color: var(--tw-ring-color);
		color: var(--tw-ring-color) !important;
	}
</style>
