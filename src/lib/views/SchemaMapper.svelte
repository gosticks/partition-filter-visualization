<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import DropdownSelect, {
		type DropdownSelectionEvent,
		type OptionConstructor
	} from '$lib/components/DropdownSelect.svelte';
	import H2 from '$lib/components/base/H2.svelte';
	import H3 from '$lib/components/base/H3.svelte';
	import Tag, { TagColor } from '$lib/components/base/Tag.svelte';
	import Button from '$lib/components/button/Button.svelte';
	import { ButtonSize, ButtonVariant } from '$lib/components/button/type';
	import { dataStore } from '$lib/store/dataStore/DataStore';
	import {
		tableSourceToString,
		type ILoadedTable,
		type TableTransformation,
		TableSource,
		type ITableReference,
		TransformationType
	} from '$lib/store/dataStore/types';
	import { AlertTriangleIcon, EditIcon, PenToolIcon, PlusIcon, XIcon } from 'svelte-feather-icons';
	import TransformerEditor, { type TransformerCreated } from './TransformerEditor.svelte';
	export let initiallySelectedTable: ILoadedTable;

	let table = initiallySelectedTable;

	const typeToColor = (typename: string): TagColor => {
		switch (typename) {
			case 'string':
				return TagColor.orange;
			case 'number':
				return TagColor.blue;
			default:
				return TagColor.default;
		}
	};

	const isColumnNew = (columnName: string) =>
		table.schema[columnName] != table.sourceSchema[columnName];

	const updateTransformation = (evt: TransformerCreated) => {
		// NOTE: hack to force rerender
		dataStore.updatePostProcessingTransformer(table, evt.detail.transformation).finally(() => {
			table = table;
		});
	};

	const addTransformer = (evt: TransformerCreated) => {
		// NOTE: hack to force rerender
		dataStore.addPostProcessingTransformer(table, evt.detail.transformation).finally(() => {
			table = table;
		});
	};

	const removeTransformer = (transformer: TableTransformation) => {
		// NOTE: hack to force rerender
		dataStore.removePostProcessingTransformer(table, transformer).finally(() => (table = table));
	};

	const tableSelectionOptionConstructor: OptionConstructor<ILoadedTable, ILoadedTable> = (
		value,
		index
	) => {
		return {
			label: value.displayName,
			value: value,
			id: index,
			initiallySelected: value === table
		};
	};

	const onTableSelected = (evt: DropdownSelectionEvent<ILoadedTable>) => {
		if (evt.detail.selected.length === 0) {
			return;
		}
		console.log({ table, new: evt.detail.selected });
		table = evt.detail.selected[0].value;
	};

	const pathForSource = (ref: ITableReference) => {
		switch (ref.source) {
			case TableSource.BUILD_IN:
				return ref.url;
			case TableSource.FILE:
				return ref.file;
			case TableSource.URL:
				return ref.url;
		}
	};
</script>

<div class="mb-2 flex gap-2 items-center">
	<H2>Schema Mapper</H2><DropdownSelect
		values={Object.values($dataStore.tables)}
		singular
		required
		optionConstructor={tableSelectionOptionConstructor}
		on:select={onTableSelected}
	/>
</div>
<div class="w-full overflow-x-scroll mb-2 border-t border-b">
	<div class="flex gap-2 py-2">
		{#each table.refs as ref}<div class="flex gap-2">
				<Card>
					<div>
						<b>Source type:</b>
						<span>{tableSourceToString(ref.source)}</span>
					</div>

					<div class="whitespace-nowrap">
						<b>URL:</b>
						<span>{pathForSource(ref)}</span>
					</div>
				</Card>
			</div>
		{/each}
	</div>
</div>
<div class="grid md:grid-cols-3 gap-4">
	<div>
		<div class="flex mb-2 gap-4 items-center">
			<H3>Transformations</H3>

			<TransformerEditor on:created={addTransformer}>
				<Button slot="trigger" size={ButtonSize.SM}>
					<svelte:fragment slot="leading">
						<PlusIcon size="14" />
					</svelte:fragment>
					Add Transformer</Button
				>
			</TransformerEditor>
		</div>
		<div class="max-h-[60vh] overflow-auto">
			{#each table.transformations as transformation}
				<Card
					><h3 class="flex items-center font-bold mr-8">
						<span class="pr-2">{transformation.name}</span>
						{#if transformation.required}
							<Tag color={TagColor.red}>required</Tag>
						{/if}
					</h3>

					<p>{transformation.description}</p>
					<div class="absolute flex right-0 top-2">
						{#if !transformation.required && TransformationType.SQL == transformation.type}<TransformerEditor
								existingTransformation={transformation}
								on:updated={updateTransformation}
							>
								<Button slot="trigger" size={ButtonSize.SM} variant={ButtonVariant.LINK}>
									<EditIcon size="20" /></Button
								>
							</TransformerEditor>{/if}
						<Button
							disabled={transformation.required}
							on:click={() => removeTransformer(transformation)}
							variant={ButtonVariant.LINK}><XIcon /></Button
						>
					</div>

					{#if transformation.lastError}<div class="mt-2">
							<Tag color={TagColor.red}>
								<div>
									<details class="w-full block">
										<summary
											><div class="text-red-600 mb-2 w-full items-baseline inline-flex gap-2">
												<AlertTriangleIcon /> <b>Transformation Failed</b>
											</div>
										</summary>
										<p class="whitespace-break-spaces">{transformation.lastError.cause}</p>
									</details>
								</div>
							</Tag>
						</div>
					{/if}
				</Card>
			{/each}
		</div>
	</div>
	<div>
		<H3 class="mb-2">Input Schema</H3>
		<div class="md:max-h-[60vh] overflow-auto">
			{#each Object.entries(table.sourceSchema) as [key, value]}
				<Tag color={typeToColor(value)}>{key}:<b>{value}</b></Tag>
			{/each}
		</div>
	</div>
	<div>
		<H3 class="mb-2">Output Schema</H3>
		<div class="md:max-h-[60vh] overflow-auto">
			{#each Object.entries(table.schema) as [key, value]}
				<Tag color={isColumnNew(key) ? TagColor.green : typeToColor(value)}
					>{key}:<b>{value}</b></Tag
				>
			{/each}
		</div>
	</div>
</div>
