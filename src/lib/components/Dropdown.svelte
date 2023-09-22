<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import Button from './button/Button.svelte';
	import { ChevronDownIcon, ChevronUpIcon } from 'svelte-feather-icons';
	import { ButtonSize } from './button/type';
	import { relativePortal } from '$lib/actions/portal';
	import clickOutside, { type ActionClickOutsideOptions } from '$lib/actions/clickOutside';

	export let isOpen: boolean = false;
	export let disabled: boolean = false;
	export let buttonClass: string | undefined = undefined;

	let className: string | undefined = undefined;
	export { className as class };

	const outsideActionParams: ActionClickOutsideOptions = {
		onClickOutside
	};

	const toggleDropdown = () => {
		console.log('hello there before', isOpen);
		isOpen = !isOpen;
		console.log('hello there after', isOpen);
	};

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

	function onClickOutside() {
		isOpen = false;
	}
</script>

<div
	class="relative mb-2 ring-offset-2 rounded-md ring-offset-background-50 dark:ring-offset-background-800 {className}"
	class:ring-4={isOpen}
>
	<Button
		size={ButtonSize.MD}
		class="flex items-center justify-between gap-2 {buttonClass}"
		on:click={toggleDropdown}
	>
		<slot name="button" />
		<svelte:fragment slot="trailing">
			{#if isOpen}
				<ChevronUpIcon size="18" />
			{:else}
				<ChevronDownIcon size="18" />
			{/if}
		</svelte:fragment>
	</Button>

	{#if isOpen}
		<div
			use:clickOutside={outsideActionParams}
			use:relativePortal
			transition:fadeSlide={{ duration: 100 }}
			class="z-1000 origin-top-left absolute left-0 mt-2 w-64 overflow-hidden rounded-xl shadow-2xl shadow-background-700 dark:shadow-background-950 bg-background-50/80 dark:bg-background-800/95 backdrop-blur-sm ring-background-200/5 dark:ring-background-950/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
		>
			<div class="dropdown-content w-full h-full overflow-y-auto max-h-[350px]">
				<div role="none">
					<slot name="content" />
				</div>
			</div>
		</div>
	{/if}
</div>

<style lang="scss">
	.dropdown-content {
		// Reset scroll bar styles
		&::-webkit-scrollbar {
			width: 0.4em;
		}

		&::-webkit-scrollbar-track {
			@apply dark:bg-slate-900 bg-slate-300;
			opacity: 0.4;
		}

		&::-webkit-scrollbar-thumb {
			@apply bg-slate-300 dark:bg-slate-600;
			border-radius: 20px;
		}
	}
</style>
