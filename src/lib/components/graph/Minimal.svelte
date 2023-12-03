<script lang="ts">
	import { getContext, onDestroy, onMount } from 'svelte';
	import type { GraphService } from './types';
	import { Minimap as MinimapRenderer } from '$lib/rendering/Minimap';
	import { browser } from '$app/environment';
	import { getGraphContext, type CameraState } from '../BasicGraph.svelte';

	const graphService: GraphService = getGraphContext();

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

	export let setCameraState = (state:CameraState) => minimalRenderer?.setCameraState(state)
</script>

<div
	class="minimap absolute isolate z-10 right-0 bottom-0 w-[190px] h-[190px]"
	bind:this={renderTargetEl}
/>
