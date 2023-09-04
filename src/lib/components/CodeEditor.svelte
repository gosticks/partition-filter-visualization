<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { editor } from 'monaco-editor';
	import { browser } from '$app/environment';
	import { settingsStore } from '$lib/store/SettingsStore';

	let editorContainer: HTMLDivElement;
	export let editor: editor.IStandaloneCodeEditor;

	export let initialCode: string = '';

	let className: string | undefined = undefined;
	export { className as class };

	let settingsUnsubscriber = settingsStore.subscribe((value) => {
		editor?.updateOptions({
			theme: value.theme === 'dark' ? 'vs-dark' : 'vs-light'
		});
	});

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

		// const languageSupport = await import('monaco-sql-languages/out/esm/sql/sql.contribution');

		editor = monaco.editor.create(editorContainer, {
			value: initialCode,
			language: 'sql',
			theme: $settingsStore.theme === 'dark' ? 'vs-dark' : 'vs-light'
		});
	});

	onDestroy(() => {
		settingsUnsubscriber();
	});
</script>

<div class={className} bind:this={editorContainer} />

<style>
</style>
