<script lang="ts" context="module">
	import type { TableTransformation } from '$lib/store/dataStore/types';
	import { TransformationType } from '$lib/store/dataStore/types';
	export type TransformerCreated = CustomEvent<{
		transformation: TableTransformation;
	}>;
</script>

<script lang="ts">
	import Input from '$lib/components/Input.svelte';
	import MiniEditor from '$lib/components/MiniEditor.svelte';
	import Button from '$lib/components/button/Button.svelte';
	import { ButtonColor } from '$lib/components/button/type';
	import Dialog from '$lib/components/dialog/Dialog.svelte';
	import { createEventDispatcher } from 'svelte';

	interface $$Events {
		created: TransformerCreated;
	}

	const initialExample =
		'ALTER TABLE "${tableName}" ADD COLUMN example TEXT; \nUPDATE "${tableName}" SET example = \'foobar\'';
	const eventDispatcher = createEventDispatcher();

	let query = initialExample;

	let isOpen = false;

	let defaultName = 'Untitled Transformation';

	let transformerName = defaultName;

	const createTransformation = () => {
		eventDispatcher('created', {
			transformation: {
				type: TransformationType.SQL,
				name: transformerName,
				description: 'Custom SQL Transformer',
				query
			}
		});

		isOpen = false;
	};

	const onClose = () => {
		isOpen = false;
		transformerName = defaultName;
	};
</script>

<button on:click={() => (isOpen = true)}>
	<slot name="trigger" />
</button>
<Dialog dialogOpen={isOpen}>
	<h2>Create custom transformer</h2>
	<Input bind:value={transformerName} placeholder="Name" />
	{transformerName}
	<p class="mb-2">
		Use DuckDB/SQL syntax, instead of table name use <span style="font-family: monospace;"
			>$&#123;tableName&#125;</span
		>
	</p>
	<MiniEditor
		initialValue={initialExample}
		on:change={(evt) => (query = evt.detail.content)}
		class="min-h-[50vh]"
	/>
	<hr />
	<div class="flex justify-end mt-2 gap-2">
		<Button on:click={onClose}>Cancel</Button>
		<Button color={ButtonColor.PRIMARY} on:click={createTransformation}>Create</Button>
	</div>
</Dialog>
