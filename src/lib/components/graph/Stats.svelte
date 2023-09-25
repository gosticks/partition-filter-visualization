<script lang="ts">
	import { getContext, onDestroy, onMount } from 'svelte';
	import type { GraphService, GraphUnsubscribe } from './types';
	import { browser } from '$app/environment';
	import Stats from 'stats.js';
	import { getGraphContext } from '../BasicGraph.svelte';
	const graphService: GraphService = getGraphContext();

	let stats: Stats;
	let statsElement: HTMLDivElement;

	let beforeUnsubscriber: GraphUnsubscribe | undefined;
	let afterUnsubscriber: GraphUnsubscribe | undefined;

	const onBeforeRender = () => {
		stats.begin();
	};

	const onAfterRender = () => {
		stats.end();
	};

	onMount(() => {
		if (!browser) return;

		beforeUnsubscriber = graphService.registerOnAfterRender(onBeforeRender);
		afterUnsubscriber = graphService.registerOnAfterRender(onAfterRender);

		stats = new Stats();

		statsElement.appendChild(stats.dom);

		stats.showPanel(1);
	});

	onDestroy(() => {
		beforeUnsubscriber?.();
		afterUnsubscriber?.();
	});
</script>

<div class="stats absolute isolate top-0 left-0" bind:this={statsElement} />

<style lang="scss">
	/* Override default stats placement */
	:global(.stats > *) {
		position: absolute !important;
	}
</style>
