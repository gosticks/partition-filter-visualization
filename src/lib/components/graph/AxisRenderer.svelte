<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { getGraphContext, type GraphService, type GraphUnsubscribe } from '../BasicGraph.svelte';
	import { AxesRenderer } from '$lib/rendering/AxesRenderer';
	import { Axis } from '$lib/rendering/AxisRenderer';

	export let scale = 1;
	export let xDivisions: number = 10;
	export let yDivisions: number = 10;
	export let zDivisions: number = 10;
	const graphService: GraphService = getGraphContext();

	const renderer = new AxesRenderer();

	const update = () => {
		const { domElement } = graphService.getValues();
		renderer.update({});
		const bounds = domElement.getBoundingClientRect();
		const size = Math.min(bounds.width, bounds.height) * scale;
		renderer.position.set(-0.5 * size, -0.5 * size, -0.5 * size);
		renderer.scale.set(size, size, size);
	};

	const valueForAxis = (axis: Axis) => {
		switch (axis) {
			case Axis.X:
				return xDivisions;
			case Axis.Y:
				return yDivisions;
			case Axis.Z:
				return zDivisions;
		}
	};

	const updateAxis = (axis: Axis) => {
		renderer.updateAxis(axis, {
			segments: valueForAxis(axis)
		});
	};

	let renderUnsubscriber: GraphUnsubscribe | undefined = undefined;

	onMount(() => {
		if (!browser) return;

		const { scene } = graphService.getValues();
		renderUnsubscriber = graphService.registerOnBeforeRender(renderer.onBeforeRender);
		update();

		scene.add(renderer);
	});
	$: xDivisions, updateAxis(Axis.X);
	$: yDivisions, updateAxis(Axis.Y);
	$: zDivisions, updateAxis(Axis.Z);

	onDestroy(() => {
		renderUnsubscriber?.();
		renderer.clear();
		renderer.removeFromParent();
	});
</script>
