<script context="module" lang="ts">
	export enum DialogSize {
		small = 'small',
		medium = 'medium',
		large = 'large'
	}

	export type DialogContextService = {
		close: () => void;
		open: () => void;
		toggle: () => boolean;
	};

	export const getDialogContext = () => getContext<DialogContextService>('dialog');
</script>

<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, onDestroy, setContext, getContext } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { defaultPortalRootClass, portal } from '$lib/actions/portal';
	import H2 from '../base/H2.svelte';

	export let size: DialogSize = DialogSize.medium;
	export let dialogOpen = false;
	let className: string | undefined = undefined;
	export { className as class };

	const preventBodyScroll = (event: Event) => {
		if (dialogOpen && event.target === document.body) {
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

	setContext<DialogContextService>('dialog', {
		close: () => (dialogOpen = false),
		open: () => (dialogOpen = true),
		toggle: () => {
			toggleDialog();
			return dialogOpen;
		}
	});

	const toggleDialog = () => {
		dialogOpen = !dialogOpen;
	};
</script>

<span
	role="button"
	tabindex="-1"
	class={className}
	on:keypress={toggleDialog}
	on:click={toggleDialog}><slot name="trigger" /></span
>

{#if dialogOpen}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<div
		role="dialog"
		use:portal
		transition:fade={{ duration: 100 }}
		class="modal-overlay {defaultPortalRootClass} fixed top-0 bottom-0 left-0 right-0 w-full h-full bg-opacity-80 dark:bg-opacity-60 bg-slate-200 dark:bg-background-950"
		on:mousedown|self={toggleDialog}
	>
		<div
			transition:fly={{ y: -120, delay: 25, duration: 150 }}
			class="modal rounded-3xl shadow-xl backdrop-blur-lg bg-background-50/75 dark:bg-background-900/75 {size}"
		>
			{#if $$slots.title}<div
					class="pb-4 mb-2 border-b border-background-100 dark:border-background-800"
				>
					<H2><slot name="title" /></H2>
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
		z-index: 20;
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

		&.small {
			max-width: 500px;
		}

		@media (max-width: 768px) {
			&:not(.small) {
				width: 100%;
			}
		}
	}
</style>
