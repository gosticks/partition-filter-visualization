<script lang="ts">
	import { browser } from '$app/environment';
	import Stats from 'stats.js';
	import { onMount, afterUpdate, beforeUpdate, onDestroy } from 'svelte';
	import {
		Scene,
		PerspectiveCamera,
		WebGLRenderer,
		AmbientLight,
		DirectionalLight,
		Group,
		Vector2,
		Vector3,
		OrthographicCamera,
		Camera,
		Object3D,
		Raycaster
	} from 'three';
	import * as THREE from 'three';

	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
	import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
	import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
	import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
	import { AxisRenderer } from '$lib/rendering/AxisRenderer';
	import { BarRenderer } from '$lib/rendering/BarRenderer';
	import { PlainRenderer } from '$lib/rendering/PlainRenderer';

	export let onHover: (position: Vector2, object?: Object3D) => void = () => {};

	export let data: Array<Array<Array<number>>> = [[[]]];

	// let displatFilter: ;

	let containerElement: HTMLDivElement;
	let statsElement: HTMLDivElement;

	let scene: Scene;
	let camera: Camera;
	let renderer: WebGLRenderer;
	let controls: OrbitControls;
	let raycaster: Raycaster;
	let outlinePass: OutlinePass;
	let composer: EffectComposer;
	let stats: Stats;

	let dataRenderer: PlainRenderer;
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
		scene = new Scene();

		scene.add(new AmbientLight(0xffffff, 0.5));

		const cameraField = Math.max(containerElement.clientWidth, containerElement.clientHeight) * 2;

		camera = new OrthographicCamera(
			containerElement.clientWidth / -2,
			containerElement.clientWidth / 2,
			containerElement.clientHeight / 2,
			containerElement.clientHeight / -2,
			-cameraField,
			cameraField
		);

		camera.position.z = 1000;

		// Add directional light pointing from camera
		const light = new DirectionalLight(0xffffff, 1);
		// const light = new PointLight(0xffffff, 1, 1000);
		light.position.set(0, 200, 500);
		light.lookAt(0, 0, 0);
		camera.add(light);

		scene.add(camera);
	}

	function windowResizeHandler(evt: UIEvent) {
		if (camera instanceof OrthographicCamera) {
			camera.left = containerElement.clientWidth / -2;
			camera.right = containerElement.clientWidth / 2;
			camera.top = containerElement.clientHeight / 2;
			camera.bottom = containerElement.clientHeight / -2;
			camera.updateProjectionMatrix();
		} else if (camera instanceof PerspectiveCamera) {
			camera.aspect = containerElement.clientWidth / containerElement.clientHeight;
			camera.updateProjectionMatrix();
		}

		renderer.setSize(containerElement.clientWidth, containerElement.clientHeight);
		composer.setSize(containerElement.clientWidth, containerElement.clientHeight);
	}

	onMount(() => {
		if (!browser) {
			return;
		}

		setupScene();

		renderer = new WebGLRenderer({ antialias: true, alpha: true });
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
			new Vector2(containerElement.clientWidth, containerElement.clientHeight),
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

		dataRenderer = new PlainRenderer(scene, camera);
		dataRenderer.setScale(new Vector3(width, width, width));
		dataRenderer.updateWithData({ data });
		axisRenderer = new AxisRenderer(scene, {
			size: new Vector3(width, height, width),
			labelScale: width / 25
		});
		axisRenderer.render();

		raycaster = new Raycaster();

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

			if (mousePosition) {
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

	beforeUpdate(() => {
		console.log('beforeUpdate');
		// Clear the scene before updating
		clearScene();
	});

	afterUpdate(() => {
		console.log('afterUpdate');

		console.log('data', data);

		// Re-create the bar chart when data is updated
		dataRenderer.updateWithData({
			data: data
		});
	});

	onDestroy(() => {
		if (!browser) {
			return;
		}

		// Clean up Three.js resources on component destroy
		clearScene();
		renderer.dispose();
	});

	let mousePosition: Vector2 = new Vector2(0, 0);
	let mouseClientPosition: Vector2 = new Vector2(0, 0);

	function handleHover(event: MouseEvent) {
		const bounds = containerElement.getBoundingClientRect();
		mouseClientPosition.x = event.clientX - bounds.left;
		mouseClientPosition.y = event.clientY - bounds.top;

		mousePosition.x = (mouseClientPosition.x / bounds.width) * 2 - 1;
		mousePosition.y = -(mouseClientPosition.y / bounds.height) * 2 + 1.0;
	}

	function clearScene() {
		console.log('clearScene');
		if (!scene) {
			return;
		}
	}
</script>

<div class="relative w-full">
	<div
		bind:this={containerElement}
		on:mousemove={handleHover}
		class="bar-chart-container w-full aspect-square overflow-hidden isolate"
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
