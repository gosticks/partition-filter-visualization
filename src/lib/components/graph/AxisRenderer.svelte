<script context="module" lang="ts">
	import { Group, Vector3 } from 'three';
	// import EnhancedGridHelper from '$lib/rendering/geometry/GridGeometry';

	// class AxisRenderHelper extends Group {
	//     private renderer: AxisRenderer = new AxisRenderer();

	// 	constructor() {
	// 		super();
	// 		this.setup();
	// 	}

	// 	update() {
	// 		this.ranges = new Vector3(x, y, z);
	// 		this.setupGridHelper();
	// 	}

	// 	public onBeforeRender = (
	// 		renderer: THREE.WebGLRenderer,
	// 		scene: THREE.Scene,
	// 		camera: THREE.Camera
	// 	) => {

	// 	};

	// 	private setup() {
	// 		this.clear();
	// 	this.axisRenderer = new AxisRenderer({
	// 		// labelScale: 10,
	// 		size: new THREE.Vector3(1, 1, 1),
	// 		labelScale: 0.075,
	// 		labelForSegment: this.axisLabelRenderer,
	// 		x: {
	// 			labelText: this.data?.labels?.x ?? 'x',
	// 			segments: this.dataWidth - 1
	// 		},
	// 		y: {
	// 			labelText: this.data?.labels?.y ?? 'y',
	// 			segments: this.dataWidth - 1
	// 		},
	// 		z: {
	// 			labelText: this.data?.labels?.z ?? 'z',
	// 			segments: this.dataDepth - 1
	// 		}
	// 	});
	// 	// center axis ar (0,0,0)
	// 	this.axisRenderer.position.set(-0.5, 0, -0.5);
	// 	this.add(this.axisRenderer);
	// }
	// 	}
	// }
</script>

<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { getGraphContext, type GraphService, type GraphUnsubscribe } from '../BasicGraph.svelte';
	import { Axis, AxisRenderer } from '$lib/rendering/AxisRenderer';

	export let scale = 1;
	export let xDivisions: number = 10;
	export let yDivisions: number = 10;
	export let zDivisions: number = 10;
	const graphService: GraphService = getGraphContext();

	const renderer = new AxisRenderer();

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
