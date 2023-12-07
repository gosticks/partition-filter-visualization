<script context="module" lang="ts">
	import { Group, Vector3 } from 'three';
	import EnhancedGridHelper from '$lib/rendering/geometry/GridGeometry';

	class GridHelperRender extends Group {
		private ranges: Vector3 = new Vector3(1, 1, 1);

		constructor() {
			super();
			this.setupGridHelper();
		}

		updateDivisions(x: number, y: number, z: number) {
			this.ranges = new Vector3(x, y, z);
			this.setupGridHelper();
		}

		private createGrid(range: [number, number]) {
			return new EnhancedGridHelper(1, range[0], range[1]);
		}

		public onBeforeRender = (
			renderer: THREE.WebGLRenderer,
			scene: THREE.Scene,
			camera: THREE.Camera
		) => {
			const cameraDirection = new Vector3();
			camera.getWorldDirection(cameraDirection);
			const defaultNormal = new Vector3(0, 1, 0);
			const grids = this.children as THREE.GridHelper[];
			// compute distance to camera and select 3th closest sides
			const closestGrids = grids
				.map((grid, idx) => [idx, grid.position.distanceTo(camera.position)])
				.sort(([, a], [, b]) => a - b);

			const gridsToHide = 3;

			// hide two closest grids
			for (let i = 0; i < grids.length; i++) {
				const [idx, distance] = closestGrids[i];
				const grid = grids[idx];
				const material = grid.material;
				let opacity = 0;
				if (i >= gridsToHide) {
					const gridNormal = defaultNormal.clone().transformDirection(grid.matrixWorld);
					const dot = cameraDirection.dot(gridNormal);
					opacity = Math.max(Math.abs(dot), 0);
				}

				if (Array.isArray(material)) {
					material.forEach((mat) => {
						mat.opacity = opacity;
						mat.transparent = true;
						mat.needsUpdate = true;
					});
				} else {
					material.opacity = opacity;
					material.transparent = true;
					material.needsUpdate = true;
				}
			}
		};

		private setupGridHelper() {
			this.clear();
			// Draw a grid for each side
			const orientations: [Vector3, Vector3, [number, number]][] = [
				// top
				[new Vector3(0, 1, 0), new Vector3(0, 1, 0), [this.ranges.x, this.ranges.z]],
				// bottom
				[new Vector3(0, 0, 0), new Vector3(0, 0, 0), [this.ranges.z, this.ranges.x]],
				[new Vector3(1, 0, 0), new Vector3(0, 0.5, -0.5), [this.ranges.y, this.ranges.x]],
				[new Vector3(0, 0, 1), new Vector3(-0.5, 0.5, 0), [this.ranges.z, this.ranges.y]],
				[new Vector3(-1, 0, 0), new Vector3(0, 0.5, 0.5), [this.ranges.y, this.ranges.x]],
				[new Vector3(0, 0, 1), new Vector3(0.5, 0.5, 0), [this.ranges.z, this.ranges.y]]
			];
			for (const [orientation, offset, range] of orientations) {
				const grid = this.createGrid(range);
				grid.setRotationFromAxisAngle(orientation, Math.PI / 2);
				grid.position.set(offset.x, offset.y, offset.z);
				this.add(grid);
			}
		}
	}
</script>

<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { getGraphContext, type GraphService, type GraphUnsubscribe } from '../BasicGraph.svelte';

	export let scale = 1;
	export let xDivisions: number = 10;
	export let yDivisions: number = 10;
	export let zDivisions: number = 10;
	const graphService: GraphService = getGraphContext();

	const renderer = new GridHelperRender();

	const update = () => {
		const { domElement } = graphService.getValues();
		renderer.updateDivisions(xDivisions, yDivisions, zDivisions);
		const bounds = domElement.getBoundingClientRect();
		const size = Math.min(bounds.width, bounds.height) * scale;
		renderer.position.set(0, -0.5 * size, 0);
		renderer.scale.set(size, size, size);
	};

	let renderUnsubscriber: GraphUnsubscribe | undefined = undefined;

	onMount(() => {
		if (!browser) return;

		const { scene } = graphService.getValues();
		renderUnsubscriber = graphService.registerOnBeforeRender(renderer.onBeforeRender);
		update();

		scene.add(renderer);
	});

	$: xDivisions, zDivisions, yDivisions, update();

	onDestroy(() => {
		renderUnsubscriber?.();
		renderer.clear();
		renderer.removeFromParent();
	});
</script>
