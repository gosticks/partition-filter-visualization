import * as THREE from 'three';
import { GraphRenderer } from './GraphRenderer';
import { DataPlaneShapeMaterial } from './materials/DataPlaneMaterial';
import { DataPlaneShapeGeometry } from './geometry/DataPlaneGeometry';
import { graphColors } from './colors';
import { AxisRenderer, defaultAxisLabelOptions } from './AxisRenderer';

interface PlaneData {
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

interface PlaneRendererOptions {
	// TODO: think about naming
	cols: number;
	rows: number;
}

const defaultRendererOptions: PlaneRendererOptions = {
	cols: 10,
	rows: 10
};

export class PlaneRenderer extends GraphRenderer<PlaneData> {
	public data?: PlaneData;
	private gridHelper?: THREE.GridHelper;
	private group?: THREE.Group;
	private options: PlaneRendererOptions;
	private size: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
	private depth = 0;
	private width = 0;
	private layers: THREE.Group[] = [];

	// Dots displayed on top of each data layer
	private layerDots: THREE.Group[] = [];
	private selectedInstanceId: number | undefined;
	private selectedLayerIndex: number | undefined;

	private min = 0;
	private max = 0;

	private axisRenderer?: AxisRenderer;

	// Getter for all bar blocks managed by the renderer
	get children(): THREE.Object3D[] {
		return this.group?.children ?? [];
	}

	constructor(options: Partial<PlaneRendererOptions> = {}) {
		super();

		this.options = {
			...defaultRendererOptions,
			...options
		};
	}

	destroy(): void {
		console.log('Destroying plane renderer');
		if (this.group) {
			this.scene?.remove(this.group);
		}
	}

	setup(scene: THREE.Scene, camera: THREE.Camera): void {
		super.setup(scene, camera);
	}

	setScale(scale: THREE.Vector3): void {
		this.size = scale;
		this.group?.scale.copy(scale).multiplyScalar(0.25);
		// this.group?.scale.copy(scale).multiply(dataScale).multiplyScalar(0.25);
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
					this.selectedInstanceId % this.width,
					this.selectedLayerIndex,
					Math.floor(this.selectedInstanceId / this.width)
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

	toggleLayer(layerIndex: number) {
		const layer = this.layers[layerIndex];
		layer.visible = !layer.visible;
	}

	updateWithData(data: PlaneData, colorPalette: THREE.ColorRepresentation[] = graphColors) {
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

		const group = new THREE.Group();

		const sphereGeo = new THREE.SphereGeometry(0.008);

		this.data = data;
		const dataWidth = data.layers[0].points[0].length;
		const dataDepth = data.layers[0].points.length;
		let globalMin = Infinity;
		let globalMax = -Infinity;

		this.layers = data.layers.map((layer, index) => {
			globalMax = Math.max(globalMax, layer.max);
			globalMin = Math.min(globalMin, layer.min);

			const plane = layer.points;
			const layerGroup = new THREE.Group();
			const geo = new DataPlaneShapeGeometry(plane, undefined, true);
			const color = new THREE.Color(layer.color ?? colorPalette[index % colorPalette.length]);

			const mat = new THREE.MeshLambertMaterial({
				color: color,
				opacity: 1,
				transparent: true,
				// clipIntersection: true,
				// clipShadows: true,
				side: THREE.DoubleSide
			});
			const mesh = new THREE.Mesh(geo, mat);

			layerGroup.add(mesh);

			// Add metadata to mesh
			mesh.userData = { index, name: layer.name, meta: layer.meta };

			this.depth = geo.planeDims.depth;
			this.width = geo.planeDims.width;

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

			const sphereMat = new THREE.MeshBasicMaterial({ color: 0xeeeeff });
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
		}

		this.min = globalMin;
		this.max = globalMax;

		// const geometry = new DataPlaneShapeGeometry(highestValues, undefined);

		// // Create a material with the custom fragment shader
		// const material = new DataPlaneShapeMaterial(new THREE.Color(0xff00ff));

		// const mesh = new THREE.Mesh(geometry, material);
		// group.add(mesh);

		this.group = group;
		this.axisRenderer = new AxisRenderer({
			// labelScale: 10,
			size: new THREE.Vector3(2, 2, 2),
			labelScale: 0.15,
			x: {
				label: { text: data.labels?.x ?? 'x' }
			},
			y: {
				label: { text: data.labels?.y ?? 'y' }
			},
			z: {
				label: { text: data.labels?.z ?? 'z' }
			}
		});
		this.axisRenderer.position.x = -1;
		this.axisRenderer.position.z = -1;
		this.group.add(this.axisRenderer);
		this.gridHelper = new THREE.GridHelper(2 * 4, (dataWidth - 1) * 4, 0x888888, 0x888888);

		// Move grid helper by half a section to align with rendering
		this.gridHelper.position.x += 1 / (dataWidth - 1);
		this.gridHelper.position.z += 1 / (dataWidth - 1);

		this.group?.add(this.gridHelper);

		this.setScale(this.size);

		// Offset grid by half of the size
		// gridHelper.position.x = -size / 2;
		// gridHelper.position.z = -size / 2;

		this.scene?.add(group);
	}
}
