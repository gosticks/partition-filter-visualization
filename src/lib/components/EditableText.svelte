<script lang="ts" context="module">
	export type ChangeEvent = CustomEvent<{
		change: string;
	}>;
</script>

<script lang="ts">
	import { CheckCircleIcon, CheckIcon } from 'svelte-feather-icons';
	import Button from './button/Button.svelte';
	import { ButtonSize } from './button/type';
	import Input from './Input.svelte';
	import clickOutside, { type ActionClickOutsideOptions } from '$lib/actions/clickOutside';
	import { createEventDispatcher } from 'svelte';

	interface $$Events {
		change: ChangeEvent;
	}

	const eventDispatcher = createEventDispatcher();

	export let value: string = '';
	let tmpValue: string = value;
	let isEditing = false;

	$: tmpValue = value;
	const onCancel = () => {
		isEditing = false;
		tmpValue = value;
	};

	const onAccept = () => {
		isEditing = false;
		eventDispatcher('change', {
			change: tmpValue
		});
	};
	const outsideClickParams: ActionClickOutsideOptions = {
		onClickOutside: onCancel
	};
</script>

{#if isEditing}<div class="flex gap-2" use:clickOutside={outsideClickParams}>
		<form on:submit={onAccept}><Input bind:value={tmpValue} autofocus /></form>
		<Button size={ButtonSize.SM} on:click={onAccept}><CheckIcon size="16" /></Button>
	</div>
{:else}
	<button on:click={() => (isEditing = true)}>
		{value}
	</button>
{/if}
