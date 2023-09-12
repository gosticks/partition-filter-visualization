<script lang="ts" generics="Data extends unknown">
	import Card from './Card.svelte';

	import { Minimap } from '$lib/rendering/Minimap';

	import type { D } from 'vitest/dist/types-71ccd11d';

	import type { DataPlaneShapeMaterial } from '$lib/rendering/materials/DataPlaneMaterial';

	import type { GraphRenderer } from '$lib/rendering/GraphRenderer';

	import { browser } from '$app/environment';
	import Stats from 'stats.js';
	import { onMount, afterUpdate, beforeUpdate, onDestroy } from 'svelte';
	import * as THREE from 'three';

	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
	import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
	import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
	import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
	import { AxisRenderer } from '$lib/rendering/AxisRenderer';
	import { PlaneRenderer } from '$lib/rendering/PlaneRenderer';

	export let onHover: (position: THREE.Vector2, object?: THREE.Object3D) => void = () => {};

	export let data: Data | undefined = undefined;
	// Internal data copy to check for changes
	let _data: Data;

	// let displatFilter: ;

	let containerElement: HTMLDivElement;
	let statsElement: HTMLDivElement;
	let minimapElement: HTMLDivElement;

	let scene: THREE.Scene;
	let camera: THREE.Camera;
	let renderer: THREE.WebGLRenderer;
	let controls: OrbitControls;
	let raycaster: THREE.Raycaster;
	let outlinePass: OutlinePass;
	let composer: EffectComposer;

	let minimap: Minimap | undefined = undefined;

	let stats: Stats;
	let setupComplete = false;
	export let dataRenderer: GraphRenderer<Data> | undefined;

	function setupControls() {
		controls = new OrbitControls(camera, renderer.domElement);
		controls.rotateSpeed = 1;
		controls.zoomSpeed = 1;
		controls.panSpeed = 1;

		controls.enableDamping = true;
		controls.dampingFactor = 0.1;
		controls.minDistance = 0.5;
		controls.maxDistance = 1000;
	}

	function setupMinimap() {
		if (!minimapElement) {
			return;
		}

		if (minimap) {
			minimap.destroy();
		}

		minimap = new Minimap(minimapElement);
		minimap.setCurrentCamera(camera);
	}

	function setupScene() {
		// Initialize Three.js scene, camera, and renderer
		scene = new THREE.Scene();

		scene.add(new THREE.AmbientLight(0xffffff, 0.5));

		const cameraField = Math.max(containerElement.clientWidth, containerElement.clientHeight) * 2;

		camera = new THREE.OrthographicCamera(
			containerElement.clientWidth / -2,
			containerElement.clientWidth / 2,
			containerElement.clientHeight / 2,
			containerElement.clientHeight / -2,
			-cameraField * 4,
			cameraField * 4
		);

		camera.position.z = 2000;
		camera.position.x = 2000;
		camera.position.y = 2000;

		// Add directional light pointing from camera
		const light = new THREE.DirectionalLight(0xffffff, 1);
		// const light = new PointLight(0xffffff, 1, 1000);
		light.position.set(0, 500, 500);
		light.lookAt(0, 0, 0);
		camera.add(light);

		scene.add(camera);
	}

	function windowResizeHandler(evt: UIEvent) {
		if (camera instanceof THREE.OrthographicCamera) {
			camera.left = containerElement.clientWidth / -2;
			camera.right = containerElement.clientWidth / 2;
			camera.top = containerElement.clientHeight / 2;
			camera.bottom = containerElement.clientHeight / -2;
			camera.updateProjectionMatrix();
		} else if (camera instanceof THREE.PerspectiveCamera) {
			camera.aspect = containerElement.clientWidth / containerElement.clientHeight;
			camera.updateProjectionMatrix();
		}

		renderer.setSize(containerElement.clientWidth, containerElement.clientHeight);
		outlinePass.setSize(containerElement.clientWidth, containerElement.clientHeight);
		composer.setSize(containerElement.clientWidth, containerElement.clientHeight);
	}

	onMount(() => {
		if (!browser) {
			return;
		}

		setupScene();

		renderer = new THREE.WebGLRenderer({ alpha: false });
		renderer.setPixelRatio(window.devicePixelRatio || 1);
		renderer.setClearColor(0x000000, 0);
		renderer.setSize(containerElement.clientWidth, containerElement.clientHeight);
		containerElement.appendChild(renderer.domElement);

		const width = containerElement.clientWidth;
		const height = containerElement.clientHeight;

		composer = new EffectComposer(renderer);

		// Add default render pass
		const renderPass = new RenderPass(scene, camera);
		composer.addPass(renderPass);

		// Outline/Hover handling
		outlinePass = new OutlinePass(
			new THREE.Vector2(containerElement.clientWidth, containerElement.clientHeight),
			scene,
			camera
		);

		outlinePass.visibleEdgeColor.set('#ff0000');
		outlinePass.hiddenEdgeColor.set('#ff0000');
		outlinePass.edgeStrength = 100;
		outlinePass.edgeThickness = 3;
		outlinePass.pulsePeriod = 2;
		composer.addPass(outlinePass);

		setupControls();

		raycaster = new THREE.Raycaster();

		stats = new Stats();
		stats.showPanel(1);
		statsElement.appendChild(stats.dom);

		setupMinimap();

		// Animation loop
		const animate = () => {
			controls.update();
			stats.begin();

			if (mousePosition && dataRenderer) {
				// Handle selection
				raycaster.setFromCamera(mousePosition, camera);

				const intersections = dataRenderer.getIntersections(raycaster);

				if (intersections.length === 0) {
					outlinePass.selectedObjects = [];
					onHover(mouseClientPosition, undefined);
				} else {
					outlinePass.selectedObjects = [intersections[0].object];
					onHover(mouseClientPosition, intersections[0].object);
				}
			}

			composer.render();
			stats.end();

			requestAnimationFrame(animate);
		};

		// Setup resize handler
		window.addEventListener('resize', windowResizeHandler);

		// Initially update render
		updateRenderer(dataRenderer);
		setupComplete = true;

		animate();
	});

	onDestroy(() => {
		if (!browser) {
			return;
		}

		window.removeEventListener('resize', windowResizeHandler);
	});

	function updateRenderer(newRenderer?: GraphRenderer<Data>) {
		if (!containerElement || !setupComplete) {
			return;
		}

		// Remove old renderer
		if (dataRenderer && dataRenderer !== newRenderer) {
			dataRenderer.destroy();
		}

		if (!newRenderer) {
			return;
		}
		dataRenderer = newRenderer;
		// Setup new renderer
		dataRenderer = newRenderer;
		dataRenderer.setup(scene, camera);
		const width = containerElement.clientWidth;
		dataRenderer.setScale(new THREE.Vector3(width, width, width));
		updateData(data);
	}

	function updateData(data?: Data) {
		if (data) {
			dataRenderer?.updateWithData(data);
		}
	}

	$: {
		if (setupComplete) {
			updateRenderer(dataRenderer);
		}
	}
	$: {
		updateData(data);
	}

	onDestroy(() => {
		if (!browser) {
			return;
		}

		// Clean up Three.js resources on component destroy
		clearScene();
		renderer.dispose();
	});

	let mousePosition: THREE.Vector2 = new THREE.Vector2(0, 0);
	let mouseClientPosition: THREE.Vector2 = new THREE.Vector2(0, 0);

	function handleHover(event: MouseEvent) {
		const bounds = containerElement.getBoundingClientRect();
		mouseClientPosition.x = event.clientX - bounds.left;
		mouseClientPosition.y = event.clientY - bounds.top;

		mousePosition.x = (mouseClientPosition.x / bounds.width) * 2 - 1;
		mousePosition.y = -(mouseClientPosition.y / bounds.height) * 2 + 1.0;
	}

	function handleClick(event: MouseEvent) {
		if (outlinePass.selectedObjects.length === 0) {
			return;
		}

		// const obj = outlinePass.selectedObjects[0];
		// if (obj.parent instanceof THREE.Group) {
		// 	obj.parent.visible = !obj.parent.visible;
		// }
	}

	function clearScene() {
		console.log('clearScene');
		if (!scene) {
			return;
		}
	}
</script>

<div class="relative w-screen h-screen">
	<div
		bind:this={containerElement}
		on:mousemove={handleHover}
		on:click={handleClick}
		class="bar-chart-container w-full h-full overflow-hidden isolate"
	/>
	<div
		class="minimap absolute isolate left-0 bottom-20 w-[200px] h-[200px]"
		bind:this={minimapElement}
	/>
	<div class="legend absolute isolate left-4 bottom-80 w-[250px]">
		{#if dataRenderer}
			{#if dataRenderer instanceof PlaneRenderer && dataRenderer.data}
				<Card title="Layers">
					{#each dataRenderer.data.layers as layer, index}
						<div
							class="flex gap-4 pb-2 cursor-pointer"
							style="opacity: ${layer.visible ? 1.0 : 0.5};"
							on:click={() => dataRenderer?.toggleLayer(index)}
						>
							<div
								class="w-5 h-5 rounded-full bg-slate-300"
								style={`background-color: ${layer.color ?? '#ff0000'};`}
							/>
							<p>{layer.name}</p>
						</div>
					{/each}
				</Card>
			{/if}
		{/if}
	</div>
	<div class="stats absolute isolate top-0 left-0" bind:this={statsElement} />
</div>

<style lang="scss">
	.bar-chart-container {
		position: relative;
	}

	/* Override default stats placement */
	:global(.stats > *) {
		position: absolute !important;
	}
</style>
