import * as THREE from 'three';
import { GraphRenderer } from './GraphRenderer';
import { graphColors } from './colors';
import { SparsePlaneGeometry, type Point3D } from './geometry/SparsePlaneGeometry';
import { SelectablePointCloud } from './geometry/PointCloudGeometry';
import { DensePlaneGeometry } from './geometry/DensePlaneGeometry';
import type { ITiledDataRow } from '$lib/store/dataStore/filterActions';
export interface IPlaneData {
	points: Point3D[];
	min: number;
	max: number;
	name: string;
	meta?: Record<string, unknown> & {
		rows: ITiledDataRow[];
	};
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

export enum DataDisplayType {
	memory = 'memory',
	cycled = 'cycled',
	time = 'time',
	percentage = 'percentage',
	number = 'number'
}

export type IPlaneRenderOptions = {
	xAxisDataType?: DataDisplayType;
	yAxisDataType?: DataDisplayType;
	zAxisDataType?: DataDisplayType;
	triangulation: PlaneTriangulation;
	showSelection: boolean;
	pointCloudColor: THREE.ColorRepresentation;
	pointCloudSize?: number;
} & Record<string, string>;
export interface IPlaneSelection {
	dataIndex: number;
	layer: IPlaneData;
	parent?: IPlaneData;
	dbEntryId: number;
	point: [number, number, number];
	position: THREE.Vector3; // reference (for performance) to position of currently hovered point, must be cloned if altered
}

export class PlaneRenderer extends GraphRenderer<IPlaneRendererData, IPlaneSelection> {
	public static defaultRenderOptions(): IPlaneRenderOptions {
		return {
			triangulation: PlaneTriangulation.delaunay,
			showSelection: true,
			pointCloudColor: 0x00ffff
		};
	}

	private colorPalette: THREE.ColorRepresentation[] = [];
	private planeGroup: THREE.Group = new THREE.Group();
	private data?: IPlaneRendererData;
	private raycaster = new THREE.Raycaster();

	private get planes() {
		return this.planeGroup.children as THREE.Group[];
	}

	// Y axis min max over all layers and sublayers
	private get globalYAxisRange(): [number, number] {
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

	constructor(private options: IPlaneRenderOptions = PlaneRenderer.defaultRenderOptions()) {
		super();
		this.raycaster.layers.set(INTERSECTION_CHECK_LAYER);
	}

	destroy(): void {
		this.cleanup();
		this.scene?.remove(this);
	}

	cleanup(): void {
		this.planeGroup.clear();
		this.clear();
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

	onResize(): void {
		console.log('Resizing plane renderer');
	}

	selectionAtPoint(glPoint: THREE.Vector2): IPlaneSelection | undefined {
		if (!this.camera || !this.data) {
			return undefined;
		}
		this.raycaster.setFromCamera(glPoint, this.camera);
		this.raycaster.layers.set(INTERSECTION_CHECK_LAYER);

		const intersection = this.raycaster.intersectObjects(this.planeGroup.children, true);
		if (intersection.length === 0) {
			return undefined;
		}
		const parent = intersection[0].object.parent;
		if (!(parent instanceof SelectablePointCloud)) {
			return undefined;
		}

		const pointCloud = intersection[0].object.parent as SelectablePointCloud;

		const data =
			pointCloud.childIndex === undefined
				? this.data.layers[pointCloud.index]
				: this.data.layers[pointCloud.index].layers?.[pointCloud.childIndex!];

		if (!data) {
			// sanity check
			return undefined;
		}

		const instanceId = intersection[0].instanceId!;

		return {
			dataIndex: instanceId,
			point: data.points[instanceId],
			layer: data,
			parent: pointCloud.childIndex ? this.data.layers[pointCloud.index] : undefined,
			dbEntryId: data.meta?.rows[instanceId].id ?? -1,
			position: pointCloud.globalPositionOfInstance(instanceId)
		};
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

		const yAxisMaxRange = this.data!.ranges.y[1];

		this.planeGroup = new THREE.Group();

		for (const [index, planeData] of data.layers.entries()) {
			const layerGroup = new THREE.Group();
			const parentLayerGroup = this.renderPlane(
				planeData,
				index,
				data.tileRange.x,
				data.tileRange.z,
				yAxisMaxRange,
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
						yAxisMaxRange,
						childIndex,
						options.showSelection
					);
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
			const pointMesh = this.renderSelectionPoints(
				planeData.points,
				this.options.pointCloudColor,
				maxHeight,
				index,
				childIndex
			);
			if (pointMesh) {
				group.add(pointMesh);
			}
			group.userData['hitMesh'] = pointMesh;
		}

		return group;
	}

	private renderSelectionPoints(
		points: Point3D[],
		color: THREE.ColorRepresentation = 0xeeeeff,
		yAxisRange: number,
		layerIndex: number,
		childLayerIndex?: number
	): SelectablePointCloud | null {
		if (!this.data) {
			return null;
		}
		// compute x and z scales since we cannot use
		// non uniform scaling -> affects circle proportions
		const xScaler = (x: number) => x / this.data!.tileRange.x;
		const yScaler = (y: number) => y / yAxisRange;
		const zScaler = (z: number) => z / this.data!.tileRange.z;
		const visibleRadius =
			this.options.pointCloudSize ??
			Math.max((Math.min(Math.min(this.data.tileRange.x) / 4), 0.01), 0.001);
		return new SelectablePointCloud(
			points,
			new THREE.Color(color),
			visibleRadius,
			1 / this.data.tileRange.x,
			layerIndex,
			childLayerIndex,
			xScaler,
			yScaler,
			zScaler
		);
	}

	////////////////////////////////
	// PlaneRenderer specific methods
	/////////////////////////////////

	private setLayerHitTest(enabled: boolean, layer: THREE.Object3D) {
		const hitMesh = layer.userData['hitMesh'] as unknown as SelectablePointCloud;
		if (!hitMesh || !(hitMesh instanceof SelectablePointCloud)) {
			return;
		}

		hitMesh.setHitTest(enabled);
	}

	toggleLayerVisibility(layerIndex: number): boolean {
		const layer = this.planes[layerIndex].children[0];
		layer.visible = !layer.visible;
		this.setLayerHitTest(layer.visible, layer);
		return layer.visible;
	}

	toggleSublayerVisibility(layerIndex: number, sublayerIndex: number): boolean {
		const group = this.planes[layerIndex].children[1];
		if (group.children.length <= sublayerIndex) {
			return false;
		}
		const layer = group.children[sublayerIndex];
		layer.visible = !layer.visible;

		this.setLayerHitTest(layer.visible, layer);
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

			this.setLayerHitTest(true, plane.children[0]);

			// Hide all sublayers
			plane.children[1].children.forEach((plane) => {
				plane.visible = true;
				this.setLayerHitTest(true, plane.children[0]);
			});
		});
	}

	hideAllLayers(): void {
		this.planes.forEach((plane) => {
			plane.children[0].visible = false;
			this.setLayerHitTest(false, plane.children[0]);

			// Hide all sublayers
			plane.children[1].children.forEach((plane) => {
				plane.visible = false;
				// prevent layer from being hit by hit-test
				plane.layers.disable(INTERSECTION_CHECK_LAYER);
			});
		});
	}

	colorForPlane(planeData: IPlaneData, index: number): THREE.Color {
		return new THREE.Color(planeData.color ?? this.colorPalette[index % this.colorPalette.length]);
	}
}
