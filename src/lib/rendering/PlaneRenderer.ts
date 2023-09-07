import * as THREE from 'three';
import { GraphRenderer } from './GraphRenderer';
import { DataPlaneShapeMaterial } from './materials/DataPlaneMaterial';
import { DataPlaneShapeGeometry } from './geometry/DataPlaneGeometry';
import {
	brighterColorList,
	graphColors,
	graphColors2,
	mediumIntensityColorList,
	softColorList
} from './colors';
import { AxisRenderer, defaultAxisLabelOptions } from './AxisRenderer';

interface PlaneData {
	// A list of ordered planes (e.g. bottom to top)
	// each plane is a 2D array of points
	layers: {
		points: (Float32Array | number[])[];
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
	private group?: THREE.Group;
	private options: PlaneRendererOptions;
	private size: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
	private depth = 0;
	private width = 0;
	private layers: THREE.Group[] = [];
	private selectedInstanceId: number | undefined;
	private selectedLayerIndex: number | undefined;

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
	}

	getIntersections(raycaster: THREE.Raycaster): THREE.Intersection[] {
		const intersection = raycaster.intersectObjects(this.children, true);
		if (!intersection.length) {
			return [];
		}

		// Filter out instanced geometry

		const instanceId = intersection[0].instanceId;

		if (instanceId === undefined) {
			if (this.selectedInstanceId !== undefined) {
				// Color in selected instance
				this.selectedInstanceId = undefined;
				this.selectedLayerIndex = undefined;
				this.onDataPointSelected?.();
			}
			return intersection;
		}

		const mesh = intersection[0].object as THREE.InstancedMesh;
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

		const sphereGeo = new THREE.SphereGeometry(0.01);

		this.data = data;
		this.layers = data.layers.map((layer, index) => {
			const plane = layer.points;
			const layerGroup = new THREE.Group();
			console.log('Normalized', data.normalized);
			const geo = new DataPlaneShapeGeometry(plane, undefined, data.normalized ?? false);
			const color = new THREE.Color(layer.color ?? colorPalette[index % colorPalette.length]);
			// const mat = new DataPlaneShapeMaterial(
			// 	color,
			// 	color,
			// 	{
			// 		opacity: 0.5,
			// 		transparent: true
			// 		// wireframe: true
			// 	}
			// 	// new THREE.Color((0xffff00 * (index + 1)) / data.data.length),
			// 	// {}
			// );
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

			const pointBuffer = geo.buffer;
			this.depth = geo.planeDims.depth;
			this.width = geo.planeDims.width;

			if (pointBuffer) {
				const sphereMat = new THREE.MeshBasicMaterial({ color: 0xeeeeff });
				const dotMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, geo.pointsPerPlane);
				dotMesh.userData = { index };
				// dotMesh.renderOrder = 10;
				dotMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
				// Set position of each dot
				const matrix = new THREE.Matrix4();
				for (let i = 0; i < geo.pointsPerPlane; i++) {
					const idx = i * DataPlaneShapeGeometry.pointComponentSize;
					matrix.setPosition(pointBuffer[idx], pointBuffer[idx + 1], pointBuffer[idx + 2]);
					dotMesh.setMatrixAt(i, matrix);
				}

				dotMesh.instanceMatrix.needsUpdate = true;
				dotMesh.computeBoundingSphere();
				layerGroup.add(dotMesh);

				// for (let i = 0; i < geo.pointsPerPlane; i++) {
				// 	const sprite = new THREE.Sprite(spriteMat);
				// 	const idx = i * DataPlaneShapeGeometry.pointComponentSize;
				// 	sprite.position.set(pointBuffer[idx], pointBuffer[idx + 1], pointBuffer[idx + 2]);
				// 	group.add(sprite);
				// }

				group.add(layerGroup);
			}
			return layerGroup;
			// dotGeometry.setAttribute('position', geo.getAttribute('position'));
			// var dotMaterial = new THREE.PointsMaterial({
			// 	size: 20,
			// 	sizeAttenuation: false,
			// 	color: 0xff0000
			// });
			// var dot = new THREE.Points(dotGeometry, dotMaterial);
			// group.add(dot);
		});
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

		this.setScale(this.size);

		this.scene?.add(group);
	}
}
