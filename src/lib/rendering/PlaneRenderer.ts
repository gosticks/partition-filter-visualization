import * as THREE from 'three';
import { GraphRenderer } from './GraphRenderer';
import { DataPlaneShapeMaterial } from './materials/DataPlaneMaterial';
import { DataPlaneShapeGeometry } from './geometry/DataPlaneGeometry';
import { graphColors } from './colors';
import { Axis, AxisRenderer, defaultAxisLabelOptions } from './AxisRenderer';

export interface IPlaneRendererData {
	// A list of ordered planes (e.g. bottom to top)
	// each plane is a 2D array of points
	layers: {
		points: (Float32Array | number[])[];
		min: number;
		max: number;
		name: string;
		meta?: Record<string, unknown>;
		color?: string;
	}[];
	labels: {
		x?: string;
		y?: string;
		z?: string;
	};
	normalized?: boolean;
	scaleY?: number;
}

export class PlaneRenderer extends GraphRenderer<IPlaneRendererData> {
	public data?: IPlaneRendererData;
	private gridHelper?: THREE.GridHelper;
	private group?: THREE.Group;
	private dataDepth = 0;
	private dataWidth = 0;
	private layers: THREE.Group[] = [];
	private scale = 2;
	private min = 0;
	private max = 0;

	private axisLabelRenderer?: (axis: Axis, segment: number) => string;

	// Dots displayed on top of each data layer
	private selectedInstanceId: number | undefined;
	private selectedLayerIndex: number | undefined;

	private axisRenderer?: AxisRenderer;

	// Getter for all bar blocks managed by the renderer
	get children(): THREE.Object3D[] {
		return this.group?.children ?? [];
	}

	constructor() {
		super();
	}

	onResize(evt: UIEvent): void {
		console.log('Resizing plane renderer');
	}

	destroy(): void {
		console.log('Destroying plane renderer');
		if (this.group) {
			this.scene?.remove(this.group);
		}
	}

	setAxisLabelRenderer(renderer?: (axis: Axis, segment: number) => string): void {
		this.axisLabelRenderer = renderer;
	}

	setup(renderContainer: HTMLElement, scene: THREE.Scene, camera: THREE.Camera): void {
		super.setup(renderContainer, scene, camera);

		// Subscribe to resize events
		// renderTargetHTMLElement.addEventListener('resize', this.onResize.bind(this));
	}

	setScale(scale: THREE.Vector3): void {
		this.size = scale;
		this.group?.position.setY(-0.1 * scale.y);
		this.group?.scale.copy(scale).multiplyScalar(1 / (this.scale * 2));
	}

	getIntersections(raycaster: THREE.Raycaster): THREE.Intersection[] {
		const intersection = raycaster.intersectObjects(this.children, true);
		if (!intersection.length) {
			return [];
		}

		// Filter out instanced geometry
		const index = intersection.findIndex(
			(i) =>
				i.instanceId !== undefined &&
				this.layers[(i.object as THREE.InstancedMesh).userData.index].visible
		);

		if (index == -1) {
			if (this.selectedInstanceId !== undefined) {
				// Color in selected instance
				this.selectedInstanceId = undefined;
				this.selectedLayerIndex = undefined;
				this.onDataPointSelected?.();
			}

			// Bypass invisible layers
			return intersection.filter((i) => i.object.visible && i.object.parent.visible);
		}

		const instanceId = intersection[index].instanceId as number;

		const mesh = intersection[index].object as THREE.InstancedMesh;
		const meshIndex = mesh.userData.index;
		if (this.selectedLayerIndex !== meshIndex && instanceId !== this.selectedInstanceId) {
			this.selectedInstanceId = instanceId;
			this.selectedLayerIndex = mesh.userData.index;

			// Color in selected instance
			const color = new THREE.Color(0xff00ff);
			mesh.setColorAt(instanceId, color);
			if (mesh.instanceColor) {
				mesh.instanceColor.needsUpdate = true;
			}

			if (this.onDataPointSelected) {
				const point = new THREE.Vector3(
					this.selectedInstanceId % this.dataDepth,
					this.selectedLayerIndex,
					Math.floor(this.selectedInstanceId / this.dataWidth)
				);

				const value = this.data?.layers[meshIndex].points[point.z][point.x];

				console.log(value);

				this.onDataPointSelected(point, {
					value,
					layer: this.data?.layers[meshIndex],
					layerIndex: meshIndex,
					instanceId
				});
			}
		}

		return [];
	}

	cleanup(): void {
		// Remove all previous layers
		this.layers.forEach((layer) => {
			this.group?.remove(layer);
			layer.clear();
		});

		// Remove axis renderer
		if (this.axisRenderer) {
			this.axisRenderer.destroy();
			this.axisRenderer = undefined;
		}

		if (this.group) {
			this.scene?.remove(this.group);
			this.group.clear();
		}
	}

	toggleLayerVisibility(layerIndex: number): boolean {
		const layer = this.layers[layerIndex];
		layer.visible = !layer.visible;

		return layer.visible;
	}

	getLayerVisibility(): boolean[] {
		return this.layers.map((layer) => layer.visible);
	}

	showAllLayers(): void {
		this.layers.forEach((layer) => {
			layer.visible = true;
		});
	}

	hideAllLayers(): void {
		this.layers.forEach((layer) => {
			layer.visible = false;
		});
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

		const group = new THREE.Group();
		const sphereGeo = new THREE.SphereGeometry(0.008);

		this.data = data;
		let globalMin = Infinity;
		let globalMax = -Infinity;

		this.layers = data.layers.map((layer, index) => {
			console.log('Layer:', layer.name, 'Min:', layer.min, 'Max:', layer.max);
			globalMax = Math.max(globalMax, layer.max);
			globalMin = Math.min(globalMin, layer.min);

			const plane = layer.points;
			const layerGroup = new THREE.Group();
			const geo = new DataPlaneShapeGeometry(plane, undefined, true);
			const color = new THREE.Color(layer.color ?? colorPalette[index % colorPalette.length]);

			const mat = new THREE.MeshLambertMaterial({
				color: color,
				opacity: 1,
				depthWrite: true,
				// clipIntersection: true,
				// clipShadows: true,
				side: THREE.DoubleSide
			});
			const mesh = new THREE.Mesh(geo, mat);

			layerGroup.add(mesh);

			// Add metadata to mesh
			mesh.userData = { index, name: layer.name, meta: layer.meta };

			this.dataDepth = geo.planeDims.depth;
			this.dataWidth = geo.planeDims.width;

			group.add(layerGroup);
			return layerGroup;
		});

		let dataScaleFactor = globalMax - globalMin;
		dataScaleFactor = dataScaleFactor === 0 ? 1 : dataScaleFactor;
		dataScaleFactor = 1 / dataScaleFactor;

		// With the scale known we can now draw the layer points
		for (const [index, layerGroup] of this.layers.entries()) {
			const geo = (layerGroup.children[0] as THREE.Mesh).geometry as DataPlaneShapeGeometry;

			if (!geo) {
				continue;
			}

			const pointBuffer = geo.buffer;
			if (!pointBuffer) {
				continue;
			}

			const sphereMat = new THREE.MeshBasicMaterial({ color: 0xeeeeff, depthWrite: false });
			const dotMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, geo.pointsPerPlane);
			dotMesh.userData = { index };
			// dotMesh.renderOrder = 10;
			dotMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
			// Set position of each dot
			const matrix = new THREE.Matrix4();
			for (let i = 0; i < geo.pointsPerPlane; i++) {
				const idx = i * DataPlaneShapeGeometry.pointComponentSize;

				// Apply scale

				matrix.setPosition(
					pointBuffer[idx],
					pointBuffer[idx + 1] * dataScaleFactor,
					pointBuffer[idx + 2]
				);

				dotMesh.setMatrixAt(i, matrix);
			}

			dotMesh.instanceMatrix.needsUpdate = true;
			dotMesh.computeBoundingSphere();

			// Scale data
			layerGroup.children[0].scale.y = dataScaleFactor;

			layerGroup.add(dotMesh);

			// Move layer group by tine amount to avoid z-fighting
			// layerGroup.position.y = index * 0.00001;
		}

		this.min = globalMin;
		this.max = globalMax;

		console.log('Min:', this.min, 'Max:', this.max);

		// const geometry = new DataPlaneShapeGeometry(highestValues, undefined);

		// // Create a material with the custom fragment shader
		// const material = new DataPlaneShapeMaterial(new THREE.Color(0xff00ff));

		// const mesh = new THREE.Mesh(geometry, material);
		// group.add(mesh);

		this.group = group;
		this.setupGridHelper();
		this.setupAxisRenderer();

		this.setScale(this.size);

		this.scene?.add(group);
	}

	private setupAxisRenderer() {
		this.axisRenderer = new AxisRenderer({
			// labelScale: 10,
			size: new THREE.Vector3(2, 2, 2),
			labelScale: 0.15,
			x: {
				label: { text: this.data?.labels?.x ?? 'x' },
				segments: this.dataWidth - 1,
				labelForSegment: this.axisLabelRenderer
					? (segment: number) => this.axisLabelRenderer?.(Axis.Y, segment)
					: undefined
			},
			y: {
				label: { text: this.data?.labels?.y ?? 'y' },
				segments: 100,
				labelForSegment: this.axisLabelRenderer
					? (segment: number) => this.axisLabelRenderer?.(Axis.Y, segment)
					: undefined
			},
			z: {
				label: { text: this.data?.labels?.z ?? 'z' },
				segments: this.dataDepth - 1,
				labelForSegment: this.axisLabelRenderer
					? (segment: number) => this.axisLabelRenderer?.(Axis.Z, segment)
					: undefined
			}
		});
		this.axisRenderer.position.x = -1;
		this.axisRenderer.position.z = -1;

		this.group?.add(this.axisRenderer);
	}

	private setupGridHelper() {
		const baseScale = 2;
		const overlapFactor = 1;

		const numWidthTiles = this.dataWidth - 1;
		const numDepthTiles = this.dataDepth - 1;
		const isWidthSmaller = numWidthTiles < numDepthTiles;
		const largerSide = isWidthSmaller ? numDepthTiles : numWidthTiles;

		this.gridHelper = new THREE.GridHelper(
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
			this.gridHelper.scale.x = numDepthTiles / numWidthTiles;
			// this.gridHelper.position.x = -xSegmentSize;
			// this.gridHelper.position.z = -zSegmentSize;
		} else {
			const xSegmentSize = baseScale / largerSide;
			const zSegmentSize = xSegmentSize * (numWidthTiles / numDepthTiles);
			this.gridHelper.scale.z = numWidthTiles / numDepthTiles;
			// this.gridHelper.position.z = -zSegmentSize;
			// this.gridHelper.position.x = -xSegmentSize;
		}

		this.group?.add(this.gridHelper);
	}
}
