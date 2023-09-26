<script lang="ts" context="module">
	export interface DropdownContext {
		open: () => void;
		close: () => void;
	}

	const CTX_NAME_DROPDOWN = 'base-dropdown-ctx';

	export const getDropdownCtx = () => getContext<DropdownContext>(CTX_NAME_DROPDOWN);
	export const setDropdownCtx = (context: DropdownContext) =>
		setContext<DropdownContext>(CTX_NAME_DROPDOWN, context);
</script>

<script lang="ts">
	import Button from './button/Button.svelte';
	import { ChevronDownIcon, ChevronUpIcon } from 'svelte-feather-icons';
	import type { ButtonSize } from './button/type';
	import { PortalPlacement, relativePortal } from '$lib/actions/portal';
	import clickOutside, { type ActionClickOutsideOptions } from '$lib/actions/clickOutside';
	import { fadeSlide } from '$lib/transitions/fadeSlide';
	import { getContext, setContext } from 'svelte';

	export let placement: PortalPlacement = PortalPlacement.BOTTOM;
	export let isOpen: boolean = false;
	export let disabled: boolean = false;
	export let buttonClass: string | undefined = undefined;

	let className: string | undefined = undefined;
	export { className as class };

	interface $$RestProps {
		size?: ButtonSize;
	}

	const outsideActionParams: ActionClickOutsideOptions = {
		onClickOutside
	};

	const toggleDropdown = () => {
		isOpen = !isOpen;
	};

	interface $$Slots {
		button: {};
		content: {};
		trigger?: {};
	}

	function onClickOutside() {
		isOpen = false;
	}

	setDropdownCtx({
		open: () => (isOpen = true),
		close: () => (isOpen = false)
	});
</script>

<div
	class="inline-block ring-offset-2 rounded-md ring-offset-background-50 dark:ring-offset-background-800 {className}"
	class:ring-4={isOpen}
>
	{#if $$slots.trigger}
		<slot name="trigger" />
	{:else}
		<div class="mb-2">
			<Button
				{...$$restProps}
				class="flex items-center justify-between gap-2 {buttonClass}"
				on:click={toggleDropdown}
			>
				<slot name="button" />
				<svelte:fragment slot="trailing">
					{#if isOpen}
						<ChevronUpIcon size="14" />
					{:else}
						<ChevronDownIcon size="14" />
					{/if}
				</svelte:fragment>
			</Button>
		</div>
	{/if}
	{#if isOpen}
		<div
			use:clickOutside={outsideActionParams}
			use:relativePortal={{
				placement
			}}
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
