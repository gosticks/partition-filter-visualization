<script lang="ts" context="module">
	import type { editor } from 'monaco-editor';

	export type EditorContentChanged = CustomEvent<{
		editorEvent: editor.IModelContentChangedEvent;
		content: string;
	}>;
</script>

<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import CodeEditor from './CodeEditor.svelte';

	interface $$Events {
		change: EditorContentChanged;
	}

	export let initialValue = '';
	let className: string = '';
	export { className as class };

	const eventDispatcher = createEventDispatcher();
	let editor: editor.IStandaloneCodeEditor;

	const onContentChanged = (evt: editor.IModelContentChangedEvent) =>
		eventDispatcher('change', {
			editorEvent: evt,
			content: editor.getValue()
		});

	$: if (editor) {
		editor.layout();
		editor.setValue(initialValue);

		editor.onDidChangeModelContent(onContentChanged);
	}
</script>

<CodeEditor bind:editor class={className} />
