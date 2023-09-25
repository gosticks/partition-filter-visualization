<script lang="ts">
	import { getContext, onDestroy, onMount } from 'svelte';
	import * as THREE from 'three';
	import type { GraphService } from './types';
	import { browser } from '$app/environment';
	import { Axis } from '$lib/rendering/AxisRenderer';
	import { colorBrewer } from '$lib/rendering/colors';
	import { getGraphContext } from '../BasicGraph.svelte';

	class SliceSelectionRenderer extends THREE.Group {
		private meshes = new Map<Axis, THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>>();
		private colors: Record<Axis, THREE.ColorRepresentation> = {
			[Axis.X]: colorBrewer.Oranges[3][0],
			[Axis.Y]: colorBrewer.Oranges[3][1],
			[Axis.Z]: colorBrewer.Oranges[3][2]
		};
		private movementDirection: Record<Axis, THREE.Vector3> = {
			[Axis.X]: new THREE.Vector3(0, 0, 1),
			[Axis.Y]: new THREE.Vector3(0, 1, 0),
			[Axis.Z]: new THREE.Vector3(1, 0, 0)
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

		private createPlane(color: THREE.ColorRepresentation, axis: Axis) {
			const geometry = new THREE.PlaneGeometry(1, 1);
			const material = new THREE.MeshBasicMaterial({
				transparent: true,
				opacity: 0.5,
				color: color,
				blendEquation: THREE.AddEquation,
				side: THREE.DoubleSide
			});
			const mesh = new THREE.Mesh(geometry, material);

			switch (axis) {
				case Axis.X:
					break;
				case Axis.Y:
					mesh.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
					break;
				case Axis.Z:
					mesh.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI / 2);
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

	export let scale = 1;

	const graphService: GraphService = getGraphContext();

	// normalized value between 0 and 1 indicating where to render x slice
	export let x: number | undefined = undefined;
	// normalized value between 0 and 1 indicating where to render y slice
	export let y: number | undefined = undefined;
	// normalized value between 0 and 1 indicating where to render y slice
	export let z: number | undefined = undefined;

	export let opacity = 0.5;
	let xColor: THREE.ColorRepresentation = 0xff0000;
	let yColor: THREE.ColorRepresentation = 0xff0000;

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
