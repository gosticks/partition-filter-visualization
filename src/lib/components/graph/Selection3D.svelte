<script lang="ts" context="module">
	import type { IPlaneSelection } from '$lib/rendering/PlaneRenderer';
	import { MeshLine, MeshLineMaterial } from 'three.meshline';
	import {
		BufferGeometry,
		SphereGeometry,
		Mesh,
		MeshBasicMaterial,
		Group,
		Vector3,
		type ColorRepresentation,
		Color
	} from 'three';

	class Selection3D extends Group {
		private selectionMesh?: Mesh;
		private selectionMeshX?: Mesh;
		private selectionMeshZ?: Mesh;
		private selectionMeshX2?: Mesh;
		private selectionMeshZ2?: Mesh;

		public set updateColors(themeColors: ThemeColors) {
			this.themeColors = themeColors;

			(this.selectionMesh!.material as MeshBasicMaterial).color = new Color(
				this.themeColors.selectionColor
			);
		}

		constructor(private themeColors: ThemeColors) {
			super();
			this.setupSelection();
		}

		private renderLine(start: Vector3, end: Vector3, color: ColorRepresentation, width = 2) {
			const geometry = new BufferGeometry().setFromPoints([start, end]);

			const meshLine = new MeshLine();
			meshLine.setGeometry(geometry);
			const material = new MeshLineMaterial({
				color: color,
				lineWidth: width
			});

			return new Mesh(meshLine.geometry, material);
		}

		setupSelection() {
			const geo = new SphereGeometry(0.02);
			const mat = new MeshBasicMaterial({
				color: this.themeColors.selectionColor,
				transparent: true,
				opacity: 0.8
			});
			this.selectionMesh = new Mesh(geo, mat);
			// this.selectionMesh.visible = false;
			this.add(this.selectionMesh);
		}

		update(selection?: IPlaneSelection) {
			if (!selection) {
				if (this.selectionMesh) {
					this.selectionMesh.visible = false;
				}
				this.renderSelectionLines();
				return;
			}

			// const matrix = new Matrix4();

			// Update local selection
			if (this.selectionMesh) {
				this.selectionMesh.visible = true;
				this.selectionMesh.position.copy(this.worldToLocal(selection.position.clone()));
				this.renderSelectionLines(selection, this.selectionMesh);
			}
		}

		private renderSelectionLines(selection?: IPlaneSelection, selectionMesh?: Mesh) {
			// cleanup old selection
			this.selectionMeshX?.removeFromParent();
			this.selectionMeshX = undefined;

			this.selectionMeshZ?.removeFromParent();
			this.selectionMeshZ = undefined;

			this.selectionMeshX2?.removeFromParent();
			this.selectionMeshX2 = undefined;

			this.selectionMeshZ2?.removeFromParent();
			this.selectionMeshZ2 = undefined;

			if (!selection || !selectionMesh) {
				return;
			}
			this.selectionMeshZ = this.renderLine(
				new Vector3(selectionMesh.position.x, selectionMesh.position.y, -0.5),
				selectionMesh.position.clone(),
				this.themeColors.selectionColor
			);
			this.selectionMeshZ2 = this.renderLine(
				new Vector3(selectionMesh.position.x, selectionMesh.position.y, -0.5),
				new Vector3(selectionMesh.position.x, -0.5, -0.5),

				this.themeColors.selectionColor
			);

			this.selectionMeshX = this.renderLine(
				new Vector3(-0.5, selectionMesh.position.y, selectionMesh.position.z),
				selectionMesh.position.clone(),

				this.themeColors.selectionColor
			);

			this.selectionMeshX2 = this.renderLine(
				new Vector3(-0.5, selectionMesh.position.y, selectionMesh.position.z),
				new Vector3(-0.5, -0.5, selectionMesh.position.z),

				this.themeColors.selectionColor
			);

			this.add(
				this.selectionMeshX,
				this.selectionMeshX2,
				this.selectionMeshZ,
				this.selectionMeshZ2
			);
		}
	}
</script>

<script lang="ts">
	import { getGraphContext, type GraphService, type GraphUnsubscribe } from '../BasicGraph.svelte';
	import { browser } from '$app/environment';
	import { onDestroy, onMount } from 'svelte';
	import type { ThemeColors } from '$lib/store/SettingsStore';
	import SettingsStore from '$lib/store/SettingsStore';

	export let selection: IPlaneSelection | undefined = undefined;
	export let scale = 0.6;

	const graphService: GraphService = getGraphContext();

	let renderer: Selection3D | undefined = undefined;
	let renderUnsubscriber: GraphUnsubscribe | undefined = undefined;

	$: $SettingsStore, updateColor();
	$: selection, update(selection);

	onMount(() => {
		if (!browser) return;

		const { scene } = graphService.getValues();
		// renderUnsubscriber = graphService.registerOnBeforeRender(renderer.onBeforeRender);
		setup();
		update(selection);
		scene.add(renderer!);
	});

	onDestroy(() => {
		renderUnsubscriber?.();
		renderer?.clear();
		renderer?.removeFromParent();
	});

	const updateColor = () => {
		if (!renderer) {
			return;
		}
		renderer.updateColors = $SettingsStore.colors;
	};

	const setup = () => {
		renderer = new Selection3D($SettingsStore.colors);
		const { domElement } = graphService.getValues();
		// renderer.update({});
		const bounds = domElement.getBoundingClientRect();
		const size = Math.min(bounds.width, bounds.height) * scale;
		renderer.position.set(0, 0, 0);
		renderer.scale.set(size, size, size);
	};

	const update = (selection?: IPlaneSelection) => {
		renderer?.update(selection);
	};
</script>
