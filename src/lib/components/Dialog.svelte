<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	export let large = false;

	export let dialogOpen = false;
	let className: string | undefined = undefined;
	export { className as class };

	const preventBodyScroll = (event: Event) => {
		if (dialogOpen) {
			event.preventDefault();
		}
	};

	onMount(() => {
		if (!browser) return;

		window.addEventListener('touchmove', preventBodyScroll, { passive: false });
		window.addEventListener('wheel', preventBodyScroll, { passive: false });
	});

	onDestroy(() => {
		if (!browser) return;

		window.removeEventListener('touchmove', preventBodyScroll);
		window.removeEventListener('wheel', preventBodyScroll);
	});

	const toggleDialog = () => {
		dialogOpen = !dialogOpen;
	};
</script>

<span class={className} on:keypress={toggleDialog} on:click={toggleDialog}
	><slot name="trigger" /></span
>

{#if dialogOpen}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div
		role="dialog"
		transition:fade={{ duration: 100 }}
		class="modal-overlay fixed top-0 bottom-0 left-0 right-0 w-full h-full bg-opacity-80 dark:bg-opacity-60 bg-slate-200 dark:bg-background-950"
		on:mousedown|self={toggleDialog}
	>
		<div
			transition:fly={{ y: -120, delay: 25, duration: 150 }}
			class="modal rounded-3xl shadow-xl bg-background-50 dark:bg-background-800"
			class:large
		>
			{#if $$slots.title}<div class="pb-4 mb-2 border-b">
					<h2 class="font-bold text-xl"><slot name="title" /></h2>
				</div>{/if}
			<slot />
			{#if $$slots.footer}
				<div>
					<slot name="footer" />
				</div>
			{/if}
		</div>
	</div>
{/if}

<style lang="scss">
	.modal-overlay {
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
	}
	.modal {
		padding: 20px;
		max-height: 90vh;
		overflow-y: auto;
		width: 80%;
		max-width: 1440px;

		&.large {
			max-width: calc(95vw - 40px);
			max-height: calc(95vh - 40px) !important;
		}
	}
</style>
