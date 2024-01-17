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
	export let editor: editor.IStandaloneCodeEditor;

	const onContentChanged = (evt: editor.IModelContentChangedEvent) => {
		initialValue = editor!.getValue();
		eventDispatcher('change', {
			editorEvent: evt,
			content: initialValue
		});
	};

	const initEditor = () => {
		editor!.layout();
		editor!.setValue(initialValue);

		editor!.onDidChangeModelContent(onContentChanged);
	};

	$: if (editor) {
		initEditor();
	}
</script>

<CodeEditor bind:editor class={className} />
