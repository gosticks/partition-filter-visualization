<script lang="ts" context="module">
	import {
		AddEquation,
		DoubleSide,
		Group,
		Mesh,
		MeshBasicMaterial,
		PlaneGeometry,
		Vector3,
		type ColorRepresentation
	} from 'three';

	class SliceSelectionRenderer extends Group {
		private meshes = new Map<Axis, Mesh<PlaneGeometry, MeshBasicMaterial>>();
		private colors: Record<Axis, ColorRepresentation> = {
			[Axis.X]: colorBrewer.Oranges[3][2],
			[Axis.Y]: colorBrewer.Oranges[3][1],
			[Axis.Z]: colorBrewer.Oranges[3][0]
		};
		private movementDirection: Record<Axis, Vector3> = {
			[Axis.X]: new Vector3(1, 0, 0),
			[Axis.Y]: new Vector3(0, 1, 0),
			[Axis.Z]: new Vector3(0, 0, 1)
		};

		constructor() {
			super();
			for (const a of [Axis.X, Axis.Y, Axis.Z]) {
				const mesh = this.createPlane(this.colors[a], a);
				mesh.visible = false;
				this.meshes.set(a, mesh);
				this.add(mesh);
			}
		}

		private createPlane(color: ColorRepresentation, axis: Axis) {
			const geometry = new PlaneGeometry(1, 1);
			const material = new MeshBasicMaterial({
				transparent: true,
				opacity: 0.5,
				color: color,
				blendEquation: AddEquation,
				side: DoubleSide
			});
			const mesh = new Mesh(geometry, material);

			switch (axis) {
				case Axis.X:
					mesh.rotateOnAxis(new Vector3(0, 1, 0), Math.PI / 2);
					break;
				case Axis.Y:
					mesh.rotateOnAxis(new Vector3(1, 0, 0), Math.PI / 2);
					break;
				case Axis.Z:
					break;
			}

			return mesh;
		}

		setAxisValue(axis: Axis, value?: number) {
			const mesh = this.meshes.get(axis);
			if (!mesh) {
				throw new Error(`SliceSelection has no mesh for axis : ${axis}`);
			}
			if (value === undefined) {
				mesh.visible = false;
			} else {
				mesh.visible = true;
				const offset = this.movementDirection[axis].clone().multiplyScalar(-0.5);
				const newPos = this.movementDirection[axis].clone().multiplyScalar(value).add(offset);
				mesh.position.set(newPos.x, newPos.y, newPos.z);
				mesh.material.needsUpdate = true;
			}
		}
	}
</script>

<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import { browser } from '$app/environment';
	import { Axis } from '$lib/rendering/AxisRenderer';
	import { colorBrewer } from '$lib/rendering/colors';
	import { getGraphContext, type GraphService } from '$lib/views/CoreGraph.svelte';

	const graphService: GraphService = getGraphContext();

	export let scale = 1;

	// normalized value between 0 and 1 indicating where to render x slice
	export let x: number | undefined = undefined;
	// normalized value between 0 and 1 indicating where to render y slice
	export let y: number | undefined = undefined;
	// normalized value between 0 and 1 indicating where to render y slice
	export let z: number | undefined = undefined;

	let sliceRenderer = new SliceSelectionRenderer();

	$: sliceRenderer.setAxisValue(Axis.X, x);
	$: sliceRenderer.setAxisValue(Axis.Y, y);
	$: sliceRenderer.setAxisValue(Axis.Z, z);

	onMount(() => {
		if (!browser) return;

		const { scene, domElement } = graphService.getValues();
		const bounds = domElement.getBoundingClientRect();
		const size = Math.min(bounds.width, bounds.height) * scale;
		sliceRenderer.scale.set(size, size, size);
		scene.add(sliceRenderer);
	});

	onDestroy(() => {
		sliceRenderer.clear();
		sliceRenderer.removeFromParent();
	});
</script>
