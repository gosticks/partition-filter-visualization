import * as THREE from 'three';
import { GraphRenderer } from './GraphRenderer';
import { DataPlaneShapeGeometry } from './geometry/DataPlaneGeometry';
import { colorBrewer, graphColors } from './colors';
import { AxisRenderer, type AxisLabelRenderer } from './AxisRenderer';

export interface IPlaneData {
	points: (Float32Array | number[])[];
	min: number;
	max: number;
	name: string;
	meta?: Record<string, unknown>;
	color?: string;
	// if set allows to render an additional set of layers
	// belonging to this layers e.g. top layer: filter (bloom,...), child layers: mode (Naive, Sectorized,...)
	layers?: IPlaneChildData[];
}

export type IPlaneChildData = Omit<IPlaneData, 'layers'> & { isChild: boolean };

export type IChildPlaneData = Omit<IPlaneData, 'layers'>[];

const INTERSECTION_CHECK_LAYER = 1;

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

export interface IPlaneSelection {
	x: number;
	y: number;
	z: number;
	layer: IPlaneData;
	parent?: IPlaneData;
	normalizedCoords: THREE.Vector3;
}

export class PlaneRenderer extends GraphRenderer<IPlaneRendererData, IPlaneSelection> {
	public data?: IPlaneRendererData;
	private grids?: THREE.Group;
	private dataDepth = 0;
	private dataWidth = 0;
	private planeGroup: THREE.Group = new THREE.Group();
	private get planes() {
		return this.planeGroup.children as THREE.Group[];
	}

	private selectionMesh?: THREE.Mesh;
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

	private raycaster = new THREE.Raycaster();
	private axisRenderer?: AxisRenderer;

	constructor() {
		super();
		console.log('Setup complete');
		this.raycaster.layers.set(INTERSECTION_CHECK_LAYER);
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

	private currentSelection?: IPlaneSelection & {
		mesh: THREE.InstancedMesh;
	};

	getInfoAtPoint(glPoint: THREE.Vector2): IPlaneSelection | undefined {
		if (!this.camera || !this.planeGroup) {
			this.currentSelection = undefined;
			if (this.selectionMesh) {
				this.selectionMesh.visible = false;
			}
			return;
		}
		this.raycaster.setFromCamera(glPoint, this.camera);
		this.raycaster.layers.set(INTERSECTION_CHECK_LAYER);
		const intersection = this.raycaster.intersectObjects(this.planeGroup.children, true);

		if (intersection.length === 0) {
			this.currentSelection = undefined;
			if (this.selectionMesh) {
				this.selectionMesh.visible = false;
			}
			return;
		}

		const item = intersection[0];
		const instanceId = item.instanceId as number;
		const mesh = item.object as THREE.InstancedMesh;

		// if selection did not change return previous selection
		if (this.currentSelection && this.currentSelection.mesh === mesh) {
			return this.currentSelection;
		}
		const meshIndex = mesh.userData.index;
		// if set layer is a child layer
		const meshChildIndex = mesh.userData.childIndex;
		const dataLayer = meshChildIndex
			? this.data?.layers[meshIndex]?.layers?.[meshChildIndex]
			: this.data?.layers[meshIndex];
		if (!dataLayer) {
			this.currentSelection = undefined;
			return;
		}
		const z = instanceId % dataLayer.points.length;
		const x = Math.floor(instanceId / dataLayer.points[0].length);

		const y = dataLayer.points[z][x];
		// const row = dataLayer.meta?.rows[instanceId];

		const normalizedCoords = new THREE.Vector3(
			x / (dataLayer.points[0].length - 1),
			y / this.max,
			z / (dataLayer.points.length - 1)
		);

		this.currentSelection = {
			layer: dataLayer,
			x,
			y,
			z,
			mesh,
			normalizedCoords
		};

		// Update local selection
		if (this.selectionMesh) {
			this.selectionMesh.visible = true;
			this.selectionMesh.position.set(
				-0.5 + normalizedCoords.z,
				normalizedCoords.y,
				-0.5 + normalizedCoords.x
			);
		}

		return this.currentSelection;
	}

	private renderPlane(
		planeData: IPlaneData,
		index: number,
		color: THREE.Color,
		childIndex?: number
	) {
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
		mesh.userData = { index, name: planeData.name, meta: planeData.meta, childIndex };

		this.dataDepth = geo.planeDims.depth;
		this.dataWidth = geo.planeDims.width;

		return mesh;
	}

	/**
	 * Renders visible Dots on data points and render invisible hit area
	 * @param layerGeometry
	 * @param index
	 * @param color
	 * @param subIndex
	 * @returns
	 */
	private renderPlaneDots(
		layerGeometry: DataPlaneShapeGeometry,
		index: number,
		childIndex?: number,
		color: THREE.ColorRepresentation = 0xeeeeff
	): THREE.Group {
		const pointBuffer = layerGeometry.buffer;
		if (!pointBuffer) {
			throw new Error(
				'Cannot render layer dots without previously buffered DataPlaneShapeGeometry'
			);
		}
		const group = new THREE.Group();
		const sphereSize = 0.008;

		const sphereGeo = new THREE.SphereGeometry(sphereSize);
		const hitSphereGeo = new THREE.SphereGeometry(sphereSize * 2);

		const sphereMat = new THREE.MeshPhongMaterial({
			color: color,
			depthWrite: false,
			transparent: true,
			opacity: 0.4
		});
		const hitSphereMat = new THREE.MeshBasicMaterial({ color: color, depthWrite: true });
		const dotMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, layerGeometry.pointsPerPlane);
		const hitDotMesh = new THREE.InstancedMesh(
			hitSphereGeo,
			hitSphereMat,
			layerGeometry.pointsPerPlane
		);
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
			hitDotMesh.setMatrixAt(i, matrix);
		}
		hitDotMesh.visible = false;
		hitDotMesh.layers.set(INTERSECTION_CHECK_LAYER);
		hitDotMesh.userData = { index, childIndex };

		group.add(hitDotMesh, dotMesh);

		return group;
	}

	setupSelection() {
		const geo = new THREE.SphereGeometry(0.02);
		const mat = new THREE.MeshBasicMaterial({
			color: colorBrewer.Oranges[4][2],
			transparent: true,
			opacity: 0.8
		});
		this.selectionMesh = new THREE.Mesh(geo, mat);
		this.selectionMesh.visible = false;
		this.add(this.selectionMesh);
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
		this.setupSelection();
		this.data = data;
		let globalMin = Infinity;
		let globalMax = -Infinity;

		const meshes: ReturnType<PlaneRenderer['renderPlane']>[] = new Array(data.layers.length);
		const childLayers: ReturnType<PlaneRenderer['renderPlane']>[][] = new Array(data.layers.length);

		for (const [index, planeData] of data.layers.entries()) {
			globalMax = Math.max(globalMax, planeData.max);
			globalMin = Math.min(globalMin, planeData.min);
			const color = new THREE.Color(planeData.color ?? colorPalette[index % colorPalette.length]);
			meshes[index] = this.renderPlane(planeData, index, color);

			childLayers[index] =
				planeData.layers?.map((childData, childIndex) => {
					const color = new THREE.Color(
						childData.color ?? colorPalette[index % colorPalette.length]
					);
					return this.renderPlane(childData, index, color, childIndex);
				}) ?? [];
		}

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

			const parentLayerGroup = new THREE.Group();
			// set scaling
			// - only scale layers
			mesh.scale.y = dataScaleFactor;

			parentLayerGroup.add(mesh);
			parentLayerGroup.add(dotMeshes[i]);

			// add reference to hit test dot mesh to simplify structure changes
			parentLayerGroup.userData['hitMesh'] = dotMeshes[i].children[0];

			group.add(parentLayerGroup);

			// render and scale child layers
			if (childLayers[i].length !== 0) {
				const childLayerGroup = new THREE.Group();

				// Render selection dots for child layers
				childLayerGroup.add(
					...childLayers[i].map((childMesh, subIndex) => {
						const childGroup = new THREE.Group();
						const geo = childMesh.geometry as DataPlaneShapeGeometry;
						if (!geo) {
							throw Error('Plane mesh be initialized before dot geometry can be created');
						}
						const dotMesh = this.renderPlaneDots(geo, i, subIndex);

						childMesh.scale.y = dataScaleFactor;
						childGroup.add(childMesh);
						childGroup.add(dotMesh);

						// Hide initially
						childGroup.visible = false;
						dotMesh.children[0].layers.disable(INTERSECTION_CHECK_LAYER);

						childGroup.userData['hitMesh'] = dotMesh.children[0];

						return childGroup;
					})
				);
				group.add(childLayerGroup);
			}

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
		const layer = this.planes[layerIndex].children[0];
		layer.visible = !layer.visible;
		const hitMesh = layer.userData?.['hitMesh'] as THREE.Mesh | undefined;
		if (hitMesh) {
			if (layer.visible) {
				hitMesh.layers.enable(INTERSECTION_CHECK_LAYER);
			} else {
				hitMesh.layers.disable(INTERSECTION_CHECK_LAYER);
			}
		}

		return layer.visible;
	}

	toggleSublayerVisibility(layerIndex: number, sublayerIndex: number): boolean {
		const group = this.planes[layerIndex].children[1];
		if (group.children.length <= sublayerIndex) {
			return false;
		}
		const layer = group.children[sublayerIndex];
		layer.visible = !layer.visible;
		const hitMesh = layer.userData?.['hitMesh'] as THREE.Mesh | undefined;
		if (hitMesh) {
			if (layer.visible) {
				hitMesh.layers.enable(INTERSECTION_CHECK_LAYER);
			} else {
				hitMesh.layers.disable(INTERSECTION_CHECK_LAYER);
			}
		}

		return layer.visible;
	}

	getLayerVisibility(): [boolean, boolean[]][] {
		// first layer is the main layer
		return this.planes.map((plane) => [
			plane.children[0].visible,
			plane.children[1].children.map((childLayer) => childLayer.visible)
		]);
	}

	showAllLayers(): void {
		this.planes.forEach((plane) => {
			plane.children[0].visible = true;
			// prevent layer from being hit by hit-test
			plane.layers.enable(INTERSECTION_CHECK_LAYER);

			// Hide all sublayers
			plane.children[1].children.forEach((plane) => {
				plane.visible = true;
				// prevent layer from being hit by hit-test
				plane.layers.enable(INTERSECTION_CHECK_LAYER);
			});
		});
	}

	hideAllLayers(): void {
		this.planes.forEach((plane) => {
			plane.children[0].visible = false;
			// prevent layer from being hit by hit-test
			plane.layers.disable(INTERSECTION_CHECK_LAYER);

			// Hide all sublayers
			plane.children[1].children.forEach((plane) => {
				plane.visible = false;
				// prevent layer from being hit by hit-test
				plane.layers.disable(INTERSECTION_CHECK_LAYER);
			});
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
