<script lang="ts">
	import { onMount } from 'svelte';
	import type { ChangeEventHandler } from 'svelte/elements';

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

	const onFileInput: ChangeEventHandler<HTMLInputElement> = (event) => {
		if (!event.currentTarget || !event.currentTarget.files) {
			return;
		}
		const files = event.currentTarget.files;
		if (files && files.length > 0 && onFileDropped) {
			onFileDropped(files);
		}
	};
</script>

<div
	class="border-4 min-h-[320px] relative rounded-xl p-6 border-background-300/70 dark:border-background-700/60 text-center border-dotted"
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
	<input
		on:change={onFileInput}
		class="absolute left-0 right-0 top-0 bottom-0 opacity-0"
		type="file"
		accept="text/csv"
	/>
</div>

<style lang="scss">
	.dragging {
		border-color: var(--tw-ring-color);
		color: var(--tw-ring-color) !important;
	}
</style>
