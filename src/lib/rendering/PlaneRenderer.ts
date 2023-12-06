import * as THREE from 'three';
import { GraphRenderer } from './GraphRenderer';
import { colorBrewer, graphColors } from './colors';
import { MeshLine, MeshLineMaterial } from 'three.meshline';
import { SparsePlaneGeometry, type Point3D } from './geometry/SparsePlaneGeometry';
import { SelectablePointCloud } from './geometry/PointCloudGeometry';
import { DensePlaneGeometry } from './geometry/DensePlaneGeometry';
export interface IPlaneData {
	points: Point3D[];
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

export const INTERSECTION_CHECK_LAYER = 1;

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

export enum PlaneTriangulation {
	grid = 'grid',
	delaunay = 'delaunay'
}

export type IPlaneRenderOptions = {
	triangulation: PlaneTriangulation;
	showSelection: boolean;
	pointCloudColor: THREE.ColorRepresentation;
	pointCloudSize?: number;
};
export interface IPlaneSelection {
	dataIndex: number;
	layer: IPlaneData;
	parent?: IPlaneData;
	point: [number, number, number];
}

export class PlaneRenderer extends GraphRenderer<IPlaneRendererData, IPlaneSelection> {
	public data?: IPlaneRendererData;

	public static defaultRenderOptions(): IPlaneRenderOptions {
		return {
			triangulation: PlaneTriangulation.delaunay,
			showSelection: true,
			pointCloudColor: 0x00ffff
		};
	}

	private colorPalette: THREE.ColorRepresentation[] = [];
	private planeGroup: THREE.Group = new THREE.Group();
	private get planes() {
		return this.planeGroup.children as THREE.Group[];
	}

	private selectionMesh?: THREE.Mesh;
	private selectionMeshX?: THREE.Mesh;
	private selectionMeshZ?: THREE.Mesh;
	private selectionMeshX2?: THREE.Mesh;
	private selectionMeshZ2?: THREE.Mesh;

	private raycaster = new THREE.Raycaster();

	constructor(private options: IPlaneRenderOptions = PlaneRenderer.defaultRenderOptions()) {
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

	setup(
		renderContainer: HTMLElement,
		scene: THREE.Scene,
		camera: THREE.Camera,
		scale: number
	): void {
		super.setup(renderContainer, scene, camera, scale);
	}

	onBeforeRender = () => {
		// Update axis renderer
	};

	private currentSelection?: IPlaneSelection & {
		mesh: THREE.InstancedMesh;
	};

	private renderLine(
		start: THREE.Vector3,
		end: THREE.Vector3,
		color: THREE.ColorRepresentation,
		width = 2
	) {
		const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);

		const meshLine = new MeshLine();
		meshLine.setGeometry(geometry);
		const material = new MeshLineMaterial({
			color: color,
			lineWidth: width
		});

		return new THREE.Mesh(meshLine.geometry, material);
	}

	private renderSelectionLines(
		selection?: PlaneRenderer['currentSelection'],
		selectionMesh?: THREE.Mesh
	) {
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
			new THREE.Vector3(selectionMesh.position.x, selectionMesh.position.y, -0.5),
			selectionMesh.position.clone(),
			0x00ff00
		);
		this.selectionMeshZ2 = this.renderLine(
			new THREE.Vector3(selectionMesh.position.x, selectionMesh.position.y, -0.5),
			new THREE.Vector3(selectionMesh.position.x, 0, -0.5),
			0x00ff00
		);

		this.selectionMeshX = this.renderLine(
			new THREE.Vector3(-0.5, selectionMesh.position.y, selectionMesh.position.z),
			selectionMesh.position.clone(),
			0xff00ff
		);

		this.selectionMeshX2 = this.renderLine(
			new THREE.Vector3(-0.5, selectionMesh.position.y, selectionMesh.position.z),
			new THREE.Vector3(-0.5, 0, selectionMesh.position.z),
			0xff00ff
		);

		this.add(this.selectionMeshX, this.selectionMeshX2, this.selectionMeshZ, this.selectionMeshZ2);
	}

	getInfoAtPoint(glPoint: THREE.Vector2): IPlaneSelection | undefined {
		if (!this.camera || !this.planeGroup) {
			this.currentSelection = undefined;
			if (this.selectionMesh) {
				this.selectionMesh.visible = false;
			}
			this.renderSelectionLines();
			return;
		}
		this.raycaster.setFromCamera(glPoint, this.camera);
		this.raycaster.layers.set(INTERSECTION_CHECK_LAYER);
		const intersection = this.raycaster.intersectObjects(this.planeGroup.children, true);

		if (intersection.length === 0) {
			this.currentSelection = undefined;
			if (this.selectionMesh) {
				this.renderSelectionLines();
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
		const point = dataLayer.points[instanceId];
		this.currentSelection = {
			layer: dataLayer,
			mesh,
			point,
			dataIndex: instanceId,
			parent: meshChildIndex ? this.data?.layers[meshIndex] : undefined
		};
		const matrix = new THREE.Matrix4();
		mesh.getMatrixAt(instanceId, matrix);
		// Update local selection
		if (this.selectionMesh) {
			this.selectionMesh.visible = true;
			this.selectionMesh.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
			this.selectionMesh.applyMatrix4(matrix);

			this.renderSelectionLines(this.currentSelection, this.selectionMesh);
		}

		return this.currentSelection;
	}

	private planeGeometry(plane: IPlaneData) {
		switch (this.options.triangulation) {
			case 'grid':
				return new DensePlaneGeometry(plane.points);
			case 'delaunay':
				return new SparsePlaneGeometry(plane.points);
		}
	}

	private renderPlane(
		planeData: IPlaneData,
		index: number,
		width: number,
		depth: number,
		maxHeight: number,
		childIndex?: number,
		renderPointCloud: boolean = true
	) {
		const group = new THREE.Group();
		group.renderOrder = index * 100 - (childIndex ?? 0);

		const geo = this.planeGeometry(planeData);

		const normFactorX = 1 / width;
		const normFactorZ = 1 / depth;
		const normFactorY = 1 / maxHeight;

		const mat = new THREE.MeshLambertMaterial({
			color: this.colorForPlane(planeData, childIndex ?? index),
			depthWrite: true,
			// clipIntersection: true,
			// clipShadows: true,
			side: THREE.DoubleSide
		});
		const mesh = new THREE.Mesh(geo, mat);
		mesh.scale.multiply(new THREE.Vector3(normFactorX, normFactorY, normFactorZ));
		// Add metadata to mesh
		mesh.userData = { index, name: planeData.name, meta: planeData.meta, childIndex };
		group.add(mesh);
		if (renderPointCloud) {
			const pointMesh = this.renderSelectionPoints(planeData.points, this.options.pointCloudColor);
			if (pointMesh) {
				pointMesh.userData = { index };
				group.add(pointMesh);
			}
		}

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

	// Y axis min max over all layers and sublayers
	get globalYAxisRange(): [number, number] {
		if (!this.data) {
			return [0, 0];
		}
		let min = Infinity;
		let max = -Infinity;
		for (const l of this.data!.layers) {
			const [childMin, childMax] = l.layers?.reduce(
				([min, max], l) => [Math.min(min, l.min), Math.max(max, l.max)],
				[min, max]
			) ?? [min, max];
			min = Math.min(l.min, childMin);
			max = Math.max(l.max, childMax);
		}

		return [min, max];
	}

	renderSelectionPoints(
		points: Point3D[],
		color: THREE.ColorRepresentation = 0xeeeeff
	): SelectablePointCloud | null {
		if (!this.data) {
			return null;
		}
		const [, max] = this.globalYAxisRange;
		// compute x and z scales since we cannot use
		// non uniform scaling -> affects circle proportions
		const xScaler = (x: number) => x / this.data!.tileRange.x;
		const yScaler = (y: number) => y / max;
		const zScaler = (z: number) => z / this.data!.tileRange.z;
		const visibleRadius =
			this.options.pointCloudSize ??
			Math.max((Math.min(Math.min(this.data.tileRange.x) / 4), 0.01), 0.001);
		return new SelectablePointCloud(
			points,
			new THREE.Color(color),
			visibleRadius,
			1 / this.data.tileRange.x,
			xScaler,
			yScaler,
			zScaler
		);
	}

	colorForPlane(planeData: IPlaneData, index: number): THREE.Color {
		return new THREE.Color(planeData.color ?? this.colorPalette[index % this.colorPalette.length]);
	}

	update(
		data: IPlaneRendererData,
		options: IPlaneRenderOptions,
		colorPalette: THREE.ColorRepresentation[] = graphColors
	) {
		this.options = options;
		// Validate data
		if (!data.layers.length) {
			console.warn('No data provided');
			return;
		}
		this.cleanup();
		this.colorPalette = colorPalette;
		this.data = data;
		const [, globalMaxHeight] = this.globalYAxisRange;

		this.planeGroup = new THREE.Group();
		this.setupSelection();

		for (const [index, planeData] of data.layers.entries()) {
			const layerGroup = new THREE.Group();
			const parentLayerGroup = this.renderPlane(
				planeData,
				index,
				data.tileRange.x,
				data.tileRange.z,
				globalMaxHeight,
				undefined,
				options.showSelection
			);

			// render sub-layers
			const childLayerGroup = new THREE.Group();
			if (planeData.layers) {
				for (const [childIndex, subPlaneData] of planeData.layers.entries()) {
					const subLayerGroup = this.renderPlane(
						subPlaneData,
						index,
						data.tileRange.x,
						data.tileRange.z,
						globalMaxHeight,
						childIndex,
						options.showSelection
					);
					// hide initially
					// subLayerGroup.visible = false;

					childLayerGroup.add(subLayerGroup);
				}
			}

			layerGroup.add(parentLayerGroup);
			layerGroup.add(childLayerGroup);

			// insert layer construct into parent layer group
			this.planeGroup.add(layerGroup);
		}
		// Move plane group to be centered at 0,0,0
		this.planeGroup.position.set(-0.5, 0, -0.5);

		this.add(this.planeGroup);
	}

	cleanup(): void {
		this.planeGroup.clear();
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
}
