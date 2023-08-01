<script lang="ts">
	import { onMount } from 'svelte';
	import type { editor } from 'monaco-editor';
	import { browser } from '$app/environment';

	let editorContainer: HTMLDivElement;
	export let editor: editor.IStandaloneCodeEditor;

	export let initialCode: string = '';

	let className: string | undefined = undefined;
	export { className as class };

	onMount(async () => {
		if (!browser) return;

		self.MonacoEnvironment = {
			getWorker: async function (workerId, label) {
				// We only support SQL for now
				let worker: any;
				switch (label) {
					case 'sql':
						worker = await import('monaco-sql-languages/out/esm/sql/sql.worker');
						break;
					default:
						worker = await import('monaco-editor/esm/vs/editor/editor.worker?worker');
						break;
				}
				return new worker.default();
			}
		};

		const monaco = await import('monaco-editor');

		const languageSupport = await import('monaco-sql-languages/out/esm/sql/sql.contribution');
		console.log(languageSupport);

		editor = monaco.editor.create(editorContainer, {
			value: initialCode,
			language: 'sql'
			// theme: 'vs-dark'
		});
	});
</script>

<div class={className} bind:this={editorContainer} />

<style>
</style>
