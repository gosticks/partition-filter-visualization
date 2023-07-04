<script lang="ts">
	import { browser } from '$app/environment';
	import Stats from 'stats.js';
	import { onMount, afterUpdate, beforeUpdate, onDestroy } from 'svelte';
	import {
		Scene,
		PerspectiveCamera,
		WebGLRenderer,
		BoxGeometry,
		MeshBasicMaterial,
		Mesh,
		Color,
		AmbientLight,
		MeshLambertMaterial,
		MeshPhongMaterial,
		DirectionalLight,
		Group,
		Light,
		PointLight,
		Vector2,
		Vector3,
		OrthographicCamera,
		Camera,
		MeshStandardMaterial,
		Object3D,
		LineBasicMaterial,
		BufferGeometry,
		BufferAttribute,
		Line,
		DoubleSide,
		Raycaster,
		ShaderMaterial,
		type Intersection
	} from 'three';

	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
	import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
	import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
	import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
	import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
	import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader';

	export let data: Array<Array<number>> = [[]];

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

	let barGroup: Group | undefined = undefined;

	function setupControls() {
		controls = new OrbitControls(camera, renderer.domElement);
		controls.rotateSpeed = 0.4;
		controls.zoomSpeed = 0.3;
		controls.panSpeed = 0;

		controls.enableDamping = true;
		controls.dampingFactor = 0.1;
	}

	function setupScene() {
		// Initialize Three.js scene, camera, and renderer
		scene = new Scene();

		scene.add(new AmbientLight(0xffffff, 0.5));

		camera = new OrthographicCamera(
			containerElement.clientWidth / -2,
			containerElement.clientWidth / 2,
			containerElement.clientHeight / 2,
			containerElement.clientHeight / -2,
			-1000,
			1000
		);

		camera.position.z = 500;

		// Add directional light pointing from camera
		const light = new DirectionalLight(0xffffff, 1);
		// const light = new PointLight(0xffffff, 1, 1000);
		light.position.set(0, 200, 500);
		light.lookAt(0, 0, 0);
		camera.add(light);

		scene.add(camera);
	}

	let hoveredObjects: Array<Object3D> = [];

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

		raycaster = new Raycaster();

		createBarChart();

		// Add the axis indicator to the scene
		const axisIndicator = createAxisIndicator(50);
		axisIndicator.position.set(-25, -20, -25);
		scene.add(axisIndicator);

		stats = new Stats();
		stats.showPanel(1);
		statsElement.appendChild(stats.dom);

		// Animation loop
		const animate = () => {
			if (!barGroup) {
				return;
			}

			controls.update();
			stats.begin();

			if (mousePosition) {
				// Handle selection
				raycaster.setFromCamera(mousePosition, camera);
				// console.log(mouse);

				const intersections = raycaster.intersectObjects(barGroup.children, true);

				if (intersections.length === 0) {
					outlinePass.selectedObjects = [];
				} else {
					outlinePass.selectedObjects = [intersections[0].object];
				}
			}

			composer.render();
			stats.end();

			requestAnimationFrame(animate);
		};
		animate();
	});

	beforeUpdate(() => {
		console.log('beforeUpdate');
		// Clear the scene before updating
		clearScene();
	});

	afterUpdate(() => {
		console.log('afterUpdate');

		// Re-create the bar chart when data is updated
		createBarChart();
	});

	onDestroy(() => {
		if (!browser) {
			return;
		}

		// Clean up Three.js resources on component destroy
		clearScene();
		renderer.dispose();
	});

	let mousePosition: Vector2 | undefined = undefined;

	function onHover(event: MouseEvent) {
		mousePosition = new Vector2(
			(event.clientX / renderer.domElement.clientWidth) * 2 - 1,
			-(event.clientY / renderer.domElement.clientHeight) * 2 + 1.0
		);
	}

	function clearScene() {
		console.log('clearScene');
		return;
		if (!scene) {
			return;
		}

		while (scene.children.length > 0) {
			scene.remove(scene.children[0]);
		}
	}

	const barGap = 15;

	function createBarChart() {
		let maxBarHeight = 0;

		let barWidth = (containerElement.clientWidth * 0.4) / data.length - barGap * 2;
		let barHeightScale = 10;

		const group = new Group();
		let positionZ = 0;
		let positionX = 0;

		// TODO: adjust data for now only mock
		for (let k = 0; k < data.length; k++) {
			positionX = 0;
			for (let i = 0; i < data.length; i++) {
				let currentBarHeight = 0;

				for (let j = 0; j < data[i].length; j++) {
					const barHeight = data[i][j] * barHeightScale;
					console.log(barHeight);
					const geometry = new BoxGeometry(barWidth, barHeight, barWidth);
					const material = new MeshLambertMaterial({
						color: Math.random() * 0xffffff
					});
					const bar = new Mesh(geometry, material);

					bar.userData = {
						data: data[i][j],
						x: k,
						y: i,
						z: j
					};

					bar.position.x = positionX;
					bar.position.y = currentBarHeight + barHeight / 2 + 2;
					bar.position.z = positionZ;
					currentBarHeight += barHeight;
					group.add(bar);
				}

				maxBarHeight = Math.max(maxBarHeight, currentBarHeight);
				positionX += barWidth + barGap;
			}

			positionZ += barWidth + barGap;
		}
		// Move group to center
		group.position.x = -positionX / 2;
		group.position.y = -maxBarHeight / 2;
		group.position.z = -positionZ / 2;

		scene.add(group);

		if (barGroup) {
			scene.remove(barGroup);
		}

		barGroup = group;
	}

	// Create the axis indicator
	function createAxisIndicator(size: number) {
		const xAxisGeometry = new BufferGeometry().setFromPoints([
			new Vector3(0, 0, 0),
			new Vector3(size, 0, 0)
		]);

		const yAxisGeometry = new BufferGeometry().setFromPoints([
			new Vector3(0, 0, 0),
			new Vector3(0, size, 0)
		]);
		const zAxisGeometry = new BufferGeometry().setFromPoints([
			new Vector3(0, 0, 0),
			new Vector3(0, 0, size)
		]);

		const xAxisMaterial = new LineBasicMaterial({
			color: 0xff0000,
			linewidth: 10,
			linecap: 'round'
		});
		const yAxisMaterial = new LineBasicMaterial({ color: 0x00ff00 });
		const zAxisMaterial = new LineBasicMaterial({ color: 0x0000ff });

		const xAxis = new Line(xAxisGeometry, xAxisMaterial);
		const yAxis = new Line(yAxisGeometry, yAxisMaterial);
		const zAxis = new Line(zAxisGeometry, zAxisMaterial);

		const axisIndicator = new Object3D();
		axisIndicator.add(xAxis);
		axisIndicator.add(yAxis);
		axisIndicator.add(zAxis);

		return axisIndicator;
	}
</script>

<div class="relative w-full">
	<div
		bind:this={containerElement}
		on:mousemove={onHover}
		class="bar-chart-container w-full aspect-square isolate"
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
