<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Minimap as MinimapRenderer } from '$lib/rendering/Minimap';
	import { browser } from '$app/environment';
	import {
		getGraphContext,
		type CameraState,
		type GraphService
	} from '$lib/views/CoreGraph.svelte';
	import SettingsStore from '$lib/store/SettingsStore';

	const graphService: GraphService = getGraphContext();
	let minimalRenderer: MinimapRenderer | undefined;
	let renderTargetEl: HTMLDivElement;

	$: $SettingsStore, updateColor();

	export const setCameraState = (state: CameraState) => {
		minimalRenderer?.setCameraState(state);
	};

	const updateColor = () => {
		if (!minimalRenderer) {
			return;
		}
		minimalRenderer.updateColors = $SettingsStore.colors;
	};

	const updateMinimap = () => {
		const { camera: graphCameral } = graphService.getValues();
		updateColor();
		// minimalRenderer = new MinimapRenderer(renderTargetEl);
		minimalRenderer?.setCurrentCamera(graphCameral);
	};

	onMount(() => {
		if (!browser) return;

		console.log('Setting up minimap renderer');
		minimalRenderer = new MinimapRenderer(renderTargetEl, $SettingsStore.colors);
		updateMinimap();
	});

	onDestroy(() => {
		minimalRenderer?.destroy();
	});
</script>

<div
	class="minimap absolute isolate right-0 bottom-0 w-[190px] h-[190px]"
	bind:this={renderTargetEl}
/>
