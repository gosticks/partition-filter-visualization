<script lang="ts" generics="Data extends unknown">
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

	export let onHover: (position: THREE.Vector2, object?: THREE.Object3D) => void = () => {};

	export let data: Data;
	// Internal data copy to check for changes
	let _data: Data;

	// let displatFilter: ;

	let containerElement: HTMLDivElement;
	let statsElement: HTMLDivElement;

	let scene: THREE.Scene;
	let camera: THREE.Camera;
	let renderer: THREE.WebGLRenderer;
	let controls: OrbitControls;
	let raycaster: THREE.Raycaster;
	let outlinePass: OutlinePass;
	let composer: EffectComposer;
	let stats: Stats;

	export let dataRenderer: GraphRenderer<Data> | undefined;
	// Internal data renderer copy to check for changes
	let _dataRenderer: typeof dataRenderer;

	let axisRenderer: AxisRenderer;

	function setupControls() {
		controls = new OrbitControls(camera, renderer.domElement);
		controls.rotateSpeed = 1;
		controls.zoomSpeed = 1;
		controls.panSpeed = 1;

		controls.enableDamping = true;
		controls.dampingFactor = 0.1;
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
			-cameraField,
			cameraField
		);

		camera.position.z = 1000;
		camera.position.x = 1000;
		camera.position.y = 1000;

		// Add directional light pointing from camera
		const light = new THREE.DirectionalLight(0xffffff, 1);
		// const light = new PointLight(0xffffff, 1, 1000);
		light.position.set(0, 200, 500);
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

		renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
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

		axisRenderer = new AxisRenderer(scene, {
			size: new THREE.Vector3(width, height, width),
			labelScale: width / 25
		});
		axisRenderer.render();

		raycaster = new THREE.Raycaster();

		stats = new Stats();
		stats.showPanel(1);
		statsElement.appendChild(stats.dom);

		const size = width * 2;
		const divisions = (width * 2) / 100;

		const gridHelper = new THREE.GridHelper(size, divisions);
		scene.add(gridHelper);

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

		animate();
	});

	onDestroy(() => {
		if (!browser) {
			return;
		}

		window.removeEventListener('resize', windowResizeHandler);
	});

	function updateRenderer() {
		if (!containerElement) {
			return;
		}

		if (_dataRenderer !== dataRenderer) {
			console.log('renderer changed');
			// Handle renderer changes
			dataRenderer?.setup(scene, camera);
			const width = containerElement.clientWidth;
			dataRenderer?.setScale(new THREE.Vector3(width, width, width));
			dataRenderer?.updateWithData(data);

			_dataRenderer = dataRenderer!;
		} else if (_data !== data) {
			console.log('Data changed');
			// Handle data only changes
			dataRenderer?.updateWithData(data);
			_data = data;
		}
	}

	beforeUpdate(() => {
		updateRenderer();
	});

	afterUpdate(() => {});

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

		const obj = outlinePass.selectedObjects[0];

		if (obj instanceof THREE.Mesh) {
			const material = obj.material as DataPlaneShapeMaterial;
			if (material.opacity < 0.6) {
				material.setOpacity(0.95);
			} else {
				material.setOpacity(0.1);
			}
		}
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
