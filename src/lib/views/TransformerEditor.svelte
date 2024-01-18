<script lang="ts" context="module">
	import type {
		ILoadedTable,
		SqlTransformation,
		TableTransformation
	} from '$lib/store/dataStore/types';
	import { TransformationType } from '$lib/store/dataStore/types';
	export type TransformerCreated = CustomEvent<{
		transformation: TableTransformation;
	}>;
	export type TransformerUpdated = CustomEvent<{
		transformation: TableTransformation;
	}>;
</script>

<script lang="ts">
	import Input from '$lib/components/Input.svelte';
	import MiniEditor from '$lib/components/MiniEditor.svelte';
	import H2 from '$lib/components/base/H2.svelte';
	import Button from '$lib/components/button/Button.svelte';
	import { dataStore } from '$lib/store/dataStore/DataStore';
	import { ButtonColor } from '$lib/components/button/type';
	import Dialog from '$lib/components/dialog/Dialog.svelte';
	import { createEventDispatcher, onMount } from 'svelte';
	import DropdownSelect, {
		type DropdownSelectionEvent,
		type OptionConstructor
	} from '$lib/components/DropdownSelect.svelte';
	import notificationStore from '$lib/store/notificationStore';
	import type { editor } from 'monaco-editor';
	import CodeEditor from '$lib/components/CodeEditor.svelte';
	import { base } from '$app/paths';

	interface $$Events {
		created: TransformerCreated;
		updated: TransformerUpdated;
	}

	export let existingTransformation: SqlTransformation | undefined = undefined;

	const initialExample =
		'ALTER TABLE "${tableName}" ADD COLUMN example TEXT; \nUPDATE "${tableName}" SET example = \'foobar\'';
	let defaultName = 'Untitled Transformation';

	const eventDispatcher = createEventDispatcher();

	let currentTransformation = `${initialExample}`;
	let transformerName = `${defaultName}`;
	let description = 'Custom SQL Transformation';

	let isOpen = false;
	let editor: editor.IStandaloneCodeEditor;

	const createTransformation = () => {
		currentTransformation = editor.getValue();
		if (existingTransformation) {
			existingTransformation.description = description;
			existingTransformation.name = transformerName;
			existingTransformation.query = editor.getValue();
			eventDispatcher('updated', {
				transformation: existingTransformation
			});
		} else {
			eventDispatcher('created', {
				transformation: {
					type: TransformationType.SQL,
					name: transformerName,
					description: 'Custom SQL Transformer',
					query: currentTransformation
				}
			});
		}

		isOpen = false;
	};

	onMount(async () => {
		if (existingTransformation) {
			if (existingTransformation?.type == TransformationType.SQL) {
				try {
					currentTransformation =
						typeof existingTransformation.query === 'string'
							? existingTransformation.query
							: await existingTransformation.query();
					description = existingTransformation.description;
					transformerName = existingTransformation.name;
				} catch {
					notificationStore.error({
						message: 'Could not load existing transformation for editing'
					});
					isOpen = false;
				}
			} else {
				notificationStore.error({
					message: 'Can only edit SQL transformation in current app version'
				});
				isOpen = false;
			}
		}
	});

	const onClose = () => {
		isOpen = false;
		transformerName = defaultName;
	};

	const transformationSelectionOptionConstructor: OptionConstructor<string, string> = (
		value,
		index
	) => {
		return {
			label: value,
			value: value,
			id: index
		};
	};

	const onTransformationSelected = (evt: DropdownSelectionEvent<string>) => {
		if (evt.detail.selected.length === 0) {
			return;
		}

		loadTransformation(evt.detail.selected[0].value);
	};

	const loadTransformation = async (fileName: string) => {
		try {
			currentTransformation = await fetch(base + '/transformations/' + fileName).then((resp) =>
				resp.text()
			);
			editor.setValue(currentTransformation);
		} catch {
			notificationStore.error({ message: 'Failed to load transformation' });
		}
	};

	$: if (isOpen && editor) {
		editor.setValue(currentTransformation);
	}
</script>

<button on:click={() => (isOpen = true)}>
	<slot name="trigger" />
</button>
<Dialog dialogOpen={isOpen}>
	<H2 class="mb-2">Create custom transformer</H2>
	<label>Name<Input bind:value={transformerName} placeholder="Name" /></label>
	<p class="mb-2 mt-4">
		Use DuckDB/SQL syntax, instead of table name use <span style="font-family: monospace;"
			>$&#123;tableName&#125;</span
		>
		<DropdownSelect
			values={Object.values($dataStore.sqlTransformations)}
			singular
			required
			optionConstructor={transformationSelectionOptionConstructor}
			on:select={onTransformationSelected}
		/>
	</p>
	<CodeEditor bind:editor class="min-h-[50vh]" />
	<hr />
	<div class="flex justify-end mt-2 gap-2">
		<Button on:click={onClose}>Cancel</Button>
		<Button color={ButtonColor.PRIMARY} on:click={createTransformation}
			>{#if existingTransformation}Save
			{:else}Create{/if}</Button
		>
	</div>
</Dialog>
