<script lang="ts" generics="Data extends unknown">
	import type { GraphRenderLoopCallback, GraphService } from './graph/types';

	import * as TWEEN from '@tweenjs/tween.js';
	import { defineService } from '$lib/contextService';

	import Card from './Card.svelte';

	import type { GraphRenderer } from '$lib/rendering/GraphRenderer';

	import { browser } from '$app/environment';

	import { onMount, onDestroy, setContext } from 'svelte';
	import * as THREE from 'three';

	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
	import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
	import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
	import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
	import Stats from './graph/Stats.svelte';

	export let onHover: (position: THREE.Vector2, object?: THREE.Object3D) => void = () => {};

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

		renderer = new THREE.WebGLRenderer({
			alpha: false,
			antialias: true,
			powerPreference: 'high-performance'
		});
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
				subscriber();
			}
			TWEEN.update(time);
			controls.update();

			// if (mousePosition) {
			// 	// Handle selection
			// 	raycaster.setFromCamera(mousePosition, camera);

			// 	// const intersections = dataRenderer.getIntersections(raycaster);

			// 	// if (intersections.length === 0) {
			// 	// 	outlinePass.selectedObjects = [];
			// 	// 	onHover(mouseClientPosition, undefined);
			// 	// } else {
			// 	// 	outlinePass.selectedObjects = [intersections[0].object];
			// 	// 	onHover(mouseClientPosition, intersections[0].object);
			// 	// }
			// }

			composer.render();
			for (const subscriber of afterSubscribers) {
				subscriber();
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

	setContext<GraphService>('graph', {
		getValues: getContextValues,
		registerOnBeforeRender,
		registerOnAfterRender
	});

	function getContextValues() {
		return {
			scene,
			camera,
			renderer,
			domElement: containerElement
		};
	}

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

	function handleClick(event: MouseEvent) {
		// if (outlinePass.selectedObjects.length === 0) {
		// 	return;
		// }
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

<div class="relative w-screen h-[80vh]">
	<div
		bind:this={containerElement}
		on:mousemove={handleHover}
		on:click={handleClick}
		class="w-full h-full overflow-hidden isolate"
	/>
	<!-- Render children only after setup complete -->
	{#if isSetupComplete}
		<slot />
		<Stats />
	{/if}
</div>

<style lang="scss">
	.bar-chart-container {
		position: relative;
	}
</style>
