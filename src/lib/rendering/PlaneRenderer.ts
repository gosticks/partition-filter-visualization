import * as THREE from 'three';
import { GraphRenderer } from './GraphRenderer';
import { DataPlaneShapeGeometry } from './geometry/DataPlaneGeometry';
import { graphColors } from './colors';
import { AxisRenderer, type AxisLabelRenderer } from './AxisRenderer';

interface IPlaneData {
	points: (Float32Array | number[])[];
	min: number;
	max: number;
	name: string;
	meta?: Record<string, unknown>;
	color?: string;
}
export interface IPlaneRendererData {
	// A list of ordered planes (e.g. bottom to top)
	// each plane is a 2D array of points
	layers: IPlaneData[];
	labels: {
		x?: string;
		y?: string;
		z?: string;
	};
	tileRange: {
		x: number;
		z: number;
	};
	ranges: {
		x: [number, number];
		y: [number, number];
		z: [number, number];
	};
}

export class PlaneRenderer extends GraphRenderer<IPlaneRendererData> {
	public data?: IPlaneRendererData;
	private grids?: THREE.Group;
	private dataDepth = 0;
	private dataWidth = 0;
	private planeGroup: THREE.Group = new THREE.Group();
	private get planes() {
		return this.planeGroup.children as THREE.Group[];
	}

	private min = 0;
	private max = 0;

	private axisLabelRenderer?: AxisLabelRenderer;

	// factor used for normalizing data into range from 0, 1 along Y axis
	// 1 / [maximum Y axis value in data]
	// is NaN if used before data is loaded
	private get yAxisNormalizationFactor() {
		if (this.max === 0) {
			return NaN;
		}

		return 1 / this.max;
	}

	// Dots displayed on top of each data layer
	private selectedInstanceId: number | undefined;
	private selectedLayerIndex: number | undefined;
	private raycaster = new THREE.Raycaster();

	private axisRenderer?: AxisRenderer;

	// override readonly type = 'PlaneRenderer';

	constructor() {
		super();
		console.log('Setup complete');
	}

	onResize(evt: UIEvent): void {
		console.log('Resizing plane renderer');
	}

	destroy(): void {
		console.log('Destroying plane renderer');
		this.cleanup();
		this.scene?.remove(this);
	}

	setAxisLabelRenderer(renderer?: AxisLabelRenderer): void {
		this.axisLabelRenderer = renderer;
	}

	setup(renderContainer: HTMLElement, scene: THREE.Scene, camera: THREE.Camera): void {
		super.setup(renderContainer, scene, camera);

		// Subscribe to resize events
		// renderTargetHTMLElement.addEventListener('resize', this.onResize.bind(this));
	}

	onBeforeRender = (
		renderer: THREE.WebGLRenderer,
		scene: THREE.Scene,
		camera: THREE.Camera,
		geometry: THREE.BufferGeometry<THREE.NormalBufferAttributes>,
		material: THREE.Material,
		group: THREE.Group
	) => {
		// Update axis renderer
		this.axisRenderer?.onBeforeRender(renderer, scene, camera, geometry, material, group);

		if (!this.grids) {
			return;
		}

		const cameraDirection = new THREE.Vector3();
		camera.getWorldDirection(cameraDirection);
		const defaultNormal = new THREE.Vector3(0, 1, 0);
		const grids = this.grids.children as THREE.GridHelper[];
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

	getIntersections(raycaster: THREE.Raycaster): THREE.Intersection[] {
		return [];
		// const intersection = raycaster.intersectObjects(this.children, true);
		// if (!intersection.length) {
		// 	return [];
		// }
		// // Filter out instanced geometry
		// const index = intersection.findIndex(
		// 	(i) =>
		// 		i.instanceId !== undefined &&
		// 		this.layers[(i.object as THREE.InstancedMesh).userData.index].visible
		// );
		// if (index == -1) {
		// 	if (this.selectedInstanceId !== undefined) {
		// 		// Color in selected instance
		// 		this.selectedInstanceId = undefined;
		// 		this.selectedLayerIndex = undefined;
		// 		this.onDataPointSelected?.();
		// 	}
		// 	// Bypass invisible layers
		// 	return intersection.filter((i) => i.object.visible && i.object.parent.visible);
		// }
		// const instanceId = intersection[index].instanceId as number;
		// const mesh = intersection[index].object as THREE.InstancedMesh;
		// const meshIndex = mesh.userData.index;
		// if (this.selectedLayerIndex !== meshIndex && instanceId !== this.selectedInstanceId) {
		// 	this.selectedInstanceId = instanceId;
		// 	this.selectedLayerIndex = mesh.userData.index;
		// 	// Color in selected instance
		// 	const color = new THREE.Color(0xff00ff);
		// 	mesh.setColorAt(instanceId, color);
		// 	if (mesh.instanceColor) {
		// 		mesh.instanceColor.needsUpdate = true;
		// 	}
		// 	if (this.onDataPointSelected) {
		// 		const point = new THREE.Vector3(
		// 			this.selectedInstanceId % this.dataDepth,
		// 			this.selectedLayerIndex,
		// 			Math.floor(this.selectedInstanceId / this.dataWidth)
		// 		);
		// 		const value = this.data?.layers[meshIndex].points[point.z][point.x];
		// 		console.log(value);
		// 		this.onDataPointSelected(point, {
		// 			value,
		// 			layer: this.data?.layers[meshIndex],
		// 			layerIndex: meshIndex,
		// 			instanceId
		// 		});
		// 	}
		// }
		// return [];
	}

	private renderPlane(planeData: IPlaneData, index: number, color: THREE.Color) {
		const plane = planeData.points;
		const geo = new DataPlaneShapeGeometry(plane, undefined, true);

		const mat = new THREE.MeshLambertMaterial({
			color: color,
			opacity: 1,
			depthWrite: true,
			// clipIntersection: true,
			// clipShadows: true,
			side: THREE.DoubleSide
		});
		const mesh = new THREE.Mesh(geo, mat);

		// Add metadata to mesh
		mesh.userData = { index, name: planeData.name, meta: planeData.meta };

		this.dataDepth = geo.planeDims.depth;
		this.dataWidth = geo.planeDims.width;

		return mesh;
	}

	private renderPlaneDots(
		layerGeometry: DataPlaneShapeGeometry,
		index: number,
		color: THREE.ColorRepresentation = 0xeeeeff
	): THREE.InstancedMesh {
		const pointBuffer = layerGeometry.buffer;
		if (!pointBuffer) {
			throw new Error(
				'Cannot render layer dots without previously buffered DataPlaneShapeGeometry'
			);
		}

		const sphereGeo = new THREE.SphereGeometry(0.008);

		const sphereMat = new THREE.MeshBasicMaterial({ color: color, depthWrite: false });
		const dotMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, layerGeometry.pointsPerPlane);
		dotMesh.userData = { index };
		// dotMesh.renderOrder = 10;
		dotMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		// Set position of each dot
		const matrix = new THREE.Matrix4();
		const yAxisScaleFactor = this.yAxisNormalizationFactor;
		for (let i = 0; i < layerGeometry.pointsPerPlane; i++) {
			const idx = i * DataPlaneShapeGeometry.pointComponentSize;

			// Apply scale

			matrix.setPosition(
				pointBuffer[idx],
				pointBuffer[idx + 1] * yAxisScaleFactor,
				pointBuffer[idx + 2]
			);

			dotMesh.setMatrixAt(i, matrix);
		}

		dotMesh.instanceMatrix.needsUpdate = true;
		dotMesh.computeBoundingSphere();

		return dotMesh;
	}

	updateWithData(
		data: IPlaneRendererData,
		colorPalette: THREE.ColorRepresentation[] = graphColors
	) {
		// Validate data
		if (!data.layers.length) {
			console.warn('No data provided');
			return;
		}
		this.cleanup();

		this.planeGroup = new THREE.Group();

		this.data = data;
		let globalMin = Infinity;
		let globalMax = -Infinity;

		const meshes = data.layers.map((planeData, index) => {
			globalMax = Math.max(globalMax, planeData.max);
			globalMin = Math.min(globalMin, planeData.min);
			const color = new THREE.Color(planeData.color ?? colorPalette[index % colorPalette.length]);
			const planeMesh = this.renderPlane(planeData, index, color);

			return planeMesh;
		});

		this.min = globalMin;
		this.max = globalMax;

		const dataScaleFactor = 1 / globalMax;

		// Render dots and scale layers
		const dotMeshes = meshes.map((planeMesh, index) => {
			const geo = planeMesh.geometry as DataPlaneShapeGeometry;
			if (!geo) {
				throw Error('Plane mesh be initialized before dot geometry can be created');
			}

			return this.renderPlaneDots(geo, index);
		});

		// Combine meshes and dotmeshes to create layer groups
		for (const [i, mesh] of meshes.entries()) {
			const group = new THREE.Group();

			// set scaling
			// - only scale layers
			mesh.scale.y = dataScaleFactor;

			group.add(mesh);
			group.add(dotMeshes[i]);

			this.planeGroup.add(group);
		}

		// Move plane group to be centered at 0,0,0
		this.planeGroup.position.set(-0.5, 0, -0.5);

		this.add(this.planeGroup);

		this.setupGridHelper();
		this.setupAxisRenderer();
		// this.setScale(this.scale);
	}

	cleanup(): void {
		// Remove axis renderer
		if (this.axisRenderer) {
			this.axisRenderer.destroy();
			this.axisRenderer = undefined;
		}
		this.planeGroup.clear();
		this.grids?.clear();
		this.clear();
	}

	////////////////////////////////
	// PlaneRenderer specific methods
	/////////////////////////////////

	toggleLayerVisibility(layerIndex: number): boolean {
		const layer = this.planes[layerIndex];
		layer.visible = !layer.visible;

		return layer.visible;
	}

	getLayerVisibility(): boolean[] {
		return this.planes.map((plane) => plane.visible);
	}

	showAllLayers(): void {
		this.planes.forEach((plane) => {
			plane.visible = true;
		});
	}

	hideAllLayers(): void {
		this.planes.forEach((plane) => {
			plane.visible = false;
		});
	}

	////////////////////////////////
	// Private helpers
	/////////////////////////////////

	private setupAxisRenderer() {
		this.axisRenderer = new AxisRenderer({
			// labelScale: 10,
			size: new THREE.Vector3(1, 1, 1),
			labelScale: 0.075,
			labelForSegment: this.axisLabelRenderer,
			x: {
				labelText: this.data?.labels?.x ?? 'x',
				segments: this.dataWidth - 1
			},
			y: {
				labelText: this.data?.labels?.y ?? 'y',
				segments: 10
			},
			z: {
				labelText: this.data?.labels?.z ?? 'z',
				segments: this.dataDepth - 1
			}
		});

		// center axis ar (0,0,0)
		this.axisRenderer.position.set(-0.5, 0, -0.5);

		this.add(this.axisRenderer);
	}

	private createGrid(baseScale = 1, overlapFactor = 1) {
		const numWidthTiles = this.dataWidth - 1;
		const numDepthTiles = this.dataDepth - 1;
		const isWidthSmaller = numWidthTiles < numDepthTiles;
		const largerSide = isWidthSmaller ? numDepthTiles : numWidthTiles;

		const gridHelper = new THREE.GridHelper(
			baseScale * overlapFactor,
			largerSide * overlapFactor,
			0x888888,
			0x888888
		);

		// Offset grid by half of the size
		// this.gridHelper.position.x = 1 / numWidthTiles;
		// this.gridHelper.position.z = -1 / numDepthTiles
		// FIXME: random missalignment with some X/Z proportions
		// Scale other axis to match
		if (isWidthSmaller) {
			const zSegmentSize = baseScale / largerSide / 2;
			const xSegmentSize = zSegmentSize * (numDepthTiles / numWidthTiles);
			gridHelper.scale.x = numDepthTiles / numWidthTiles;
			// this.gridHelper.position.x = -xSegmentSize;
			// this.gridHelper.position.z = -zSegmentSize;
		} else {
			const xSegmentSize = baseScale / largerSide;
			const zSegmentSize = xSegmentSize * (numWidthTiles / numDepthTiles);
			gridHelper.scale.z = numWidthTiles / numDepthTiles;
			// this.gridHelper.position.z = -zSegmentSize;
			// this.gridHelper.position.x = -xSegmentSize;
		}

		return gridHelper;
	}

	private setupGridHelper() {
		if (this.grids) {
			this.grids.clear();
		} else {
			this.grids = new THREE.Group();
		}

		// Draw a grid for each side
		const orientations = [
			[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0)],
			[new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)],
			[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.5, -0.5)],
			[new THREE.Vector3(0, 0, 1), new THREE.Vector3(-0.5, 0.5, 0)],
			[new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0.5, 0.5)],
			[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0.5, 0.5, 0)]
		];

		for (const [orientation, offset] of orientations) {
			const grid = this.createGrid();

			grid.setRotationFromAxisAngle(orientation, Math.PI / 2);
			grid.position.set(offset.x, offset.y, offset.z);
			this.grids.add(grid);
		}

		this.add(this.grids);
	}
}
