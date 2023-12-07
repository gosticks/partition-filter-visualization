<script lang="ts" context="module">
	export type GraphUnsubscribe = () => void;

	export type GraphRenderLoopCallback = (
		renderer: THREE.WebGLRenderer,
		scene: THREE.Scene,
		camera: THREE.Camera,
		geometry?: THREE.BufferGeometry<THREE.NormalBufferAttributes>,
		material?: THREE.Material,
		group?: THREE.Group
	) => void;

	export type CameraState = {
		position: THREE.Vector3;
		rotation: THREE.Euler;
	};

	// let displatFilter: ;
	export type GraphService = {
		getValues: () => {
			scene: THREE.Scene;
			camera: THREE.Camera;
			renderer: THREE.WebGLRenderer;
			domElement: HTMLDivElement;
		};
		registerOnBeforeRender: (callback: GraphRenderLoopCallback) => GraphUnsubscribe;
		registerOnAfterRender: (callback: GraphRenderLoopCallback) => GraphUnsubscribe;
		getScreenshot: () => string;
		getCameraState: () => CameraState;
		setCameraState: (state: CameraState) => void;
	};

	export const CTX_NAME_GRAPH = 'graph';

	export const getGraphContext = () => getContext<GraphService>(CTX_NAME_GRAPH);
	export const getGraphContextValues = () => getGraphContext().getValues();
	export const setGraphContext = (service: GraphService) => setContext(CTX_NAME_GRAPH, service);
</script>

<script lang="ts">
	import * as TWEEN from '@tweenjs/tween.js';
	import * as THREE from 'three';
	import { onMount, onDestroy, setContext, getContext } from 'svelte';
	import { browser } from '$app/environment';

	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
	import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
	import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
	import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
	// import Stats from './graph/Stats.svelte';

	let containerElement: HTMLDivElement;

	let scene: THREE.Scene;
	let camera: THREE.Camera;
	let renderer: THREE.WebGLRenderer;
	let controls: OrbitControls;
	let outlinePass: OutlinePass;
	let composer: EffectComposer;
	let isSetupComplete = false;
	let stats: Stats;

	function setupControls() {
		controls = new OrbitControls(camera, renderer.domElement);
		controls.rotateSpeed = 1;
		controls.zoomSpeed = 1;
		controls.panSpeed = 1;

		controls.enablePan = false;
		controls.enableZoom = true;
		controls.enableRotate = false;

		controls.enableDamping = true;
		controls.dampingFactor = 0.1;
		controls.minDistance = 0.5;
		controls.maxDistance = 1000;

		controls.reset();

		controls.addEventListener('change', () => {
			controls.saveState();
		});
	}

	function setupScene() {
		// Initialize Three.js scene, camera, and renderer
		scene = new THREE.Scene();

		scene.add(new THREE.AmbientLight(0xffffff, 1));

		const cameraField = Math.max(containerElement.clientWidth, containerElement.clientHeight) * 2;

		camera = new THREE.OrthographicCamera(
			containerElement.clientWidth / -2,
			containerElement.clientWidth / 2,
			containerElement.clientHeight / 2,
			containerElement.clientHeight / -2,
			-cameraField * 10,
			cameraField * 10
		);

		camera.position.z = 2000;
		camera.position.x = 2000;
		camera.position.y = 2000;

		// Add directional light pointing from camera
		const light = new THREE.DirectionalLight(0xffffff, 3);
		// const light = new PointLight(0xffffff, 1, 1000);
		light.position.set(0, 1000, 1000);
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

		renderer = new THREE.WebGLRenderer({
			alpha: false,
			antialias: true,
			powerPreference: 'high-performance',
			// logarithmicDepthBuffer: true,
			preserveDrawingBuffer: true,
			failIfMajorPerformanceCaveat: true
			// precision: 'lowp'
		});
		renderer.domElement.setAttribute('id', 'basic-graph');
		renderer.setPixelRatio(window.devicePixelRatio || 1);
		renderer.setClearColor(0x000000, 0);
		renderer.setSize(containerElement.clientWidth, containerElement.clientHeight);
		containerElement.appendChild(renderer.domElement);

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

		// Animation loop
		const animate = (time: number) => {
			// call all before subscribers
			for (const subscriber of beforeSubscribers) {
				subscriber(renderer, scene, camera);
			}
			// Update tween for all animations
			TWEEN.update(time);

			controls.update();
			composer.render();

			for (const subscriber of afterSubscribers) {
				subscriber(renderer, scene, camera);
			}

			requestAnimationFrame(animate);
		};

		// Setup resize handler
		window.addEventListener('resize', windowResizeHandler);

		isSetupComplete = true;

		// Set scene and camera to context
		animate(0);
	});

	const beforeSubscribers: Set<GraphRenderLoopCallback> = new Set();
	const afterSubscribers: Set<GraphRenderLoopCallback> = new Set();

	const registerOnBeforeRender = (callback: GraphRenderLoopCallback) => {
		beforeSubscribers.add(callback);

		return () => {
			beforeSubscribers.delete(callback);
		};
	};

	const registerOnAfterRender = (callback: GraphRenderLoopCallback) => {
		afterSubscribers.add(callback);

		return () => {
			afterSubscribers.delete(callback);
		};
	};

	const getScreenshot = () => renderer.domElement.toDataURL('image/png');

	const getCameraState = () => ({ rotation: camera.rotation, position: camera.position });
	export const setCameraState = (state: CameraState) => {
		camera.rotation.copy(state.rotation);
		camera.position.copy(state.position);
		controls.update();
	};

	export const getValues = () => {
		return {
			scene,
			camera,
			renderer,
			domElement: containerElement
		};
	};

	export const getContextValues = () => ({
		getValues: getValues,
		getScreenshot: getScreenshot,
		getCameraState: getCameraState,
		setCameraState: setCameraState,
		registerOnBeforeRender,
		registerOnAfterRender
	});

	setGraphContext(getContextValues());

	onDestroy(() => {
		if (!browser) {
			return;
		}

		window.removeEventListener('resize', windowResizeHandler);
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

	function clearScene() {
		console.log('clearScene');
		if (!scene) {
			return;
		}
	}
</script>

<div class="relative w-screen h-screen">
	<div bind:this={containerElement} class="w-full h-full overflow-hidden isolate" />
	<!-- Render children only after setup complete -->
	{#if isSetupComplete}
		<slot name="inner" />
		<!-- <Stats /> -->
	{/if}
</div>
<slot />

<style lang="scss">
	.bar-chart-container {
		position: relative;
	}
</style>
