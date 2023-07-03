<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import Button from './Button.svelte';
	import { ChevronDownIcon, ChevronUpIcon } from 'svelte-feather-icons';

	export let isOpen: boolean = false;
	export let disabled: boolean = false;
	export let buttonClass: string | undefined = undefined;

	let className: string | undefined = undefined;
	export { className as class };

	let popoverElement: HTMLDivElement;

	function toggleDropdown() {
		isOpen = !isOpen;
	}

	interface $$Slots {
		button: {};
		content: {};
	}

	function fadeSlide(node: HTMLElement, options?: { duration?: number }) {
		return {
			duration: options?.duration || 100,
			css: (t: number) => `
				transform: translateY(${(1 - t) * -20}px) scale(${0.9 + t * 0.1});
                opacity: ${t};
			`
		};
	}
	function handleClickOutside(event: MouseEvent) {
		if (popoverElement && !popoverElement.contains(event.target as Node)) {
			isOpen = false;
		}
	}

	// Close the dropdown when clicking outside
	onMount(() => {
		if (browser) {
			window.addEventListener('click', handleClickOutside);
		}
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener('click', handleClickOutside);
		}
	});
</script>

<div class="relative {className}" bind:this={popoverElement}>
	<Button
		class="flex items-center justify-between gap-2 {buttonClass}"
		on:click={toggleDropdown}
		{disabled}
	>
		<slot name="button" />
		{#if isOpen}
			<ChevronDownIcon />
		{:else}
			<ChevronUpIcon />
		{/if}
	</Button>

	{#if isOpen}
		<div
			transition:fadeSlide={{ duration: 100 }}
			class="z-10 overflow-hidden origin-top-left absolute left-0 mt-2 w-56 rounded-xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
		>
			<div role="none">
				<slot name="content" />
			</div>
		</div>
	{/if}
</div>
