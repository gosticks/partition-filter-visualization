<script lang="ts">
	import { getContext, onDestroy, onMount } from 'svelte';
	import type { GraphService } from './types';
	import { Minimap as MinimapRenderer } from '$lib/rendering/Minimap';
	import { browser } from '$app/environment';

	const graphService: GraphService = getContext('graph');

	let minimalRenderer: MinimapRenderer | undefined;

	let renderTargetEl: HTMLDivElement;

	const updateMinimap = () => {
		const { camera: graphCameral } = graphService.getValues();
		// minimalRenderer = new MinimapRenderer(renderTargetEl);
		minimalRenderer?.setCurrentCamera(graphCameral);
	};

	onMount(() => {
		if (!browser) return;

		console.log('Setting up minimap renderer');

		minimalRenderer = new MinimapRenderer(renderTargetEl);
		updateMinimap();
	});

	onDestroy(() => {
		minimalRenderer?.destroy();
	});
</script>

<div
	class="minimap absolute isolate left-0 bottom-20 w-[200px] h-[200px]"
	bind:this={renderTargetEl}
/>
