import * as THREE from 'three';
import { GraphRenderer } from './GraphRenderer';
import { DataPlaneShapeMaterial } from './materials/DataPlaneMaterial';
import { DataPlaneShapeGeometry } from './geometry/DataPlaneGeometry';

interface PlaneData {
	// A list of ordered planes (e.g. bottom to top)
	// each plane is a 2D array of points
	data: number[][][];

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
	private group?: THREE.Group;
	private options: PlaneRendererOptions;
	private size: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
	private depth = 0;
	private width = 0;
	private selectedInstanceId: number | undefined;
	private selectedLayerIndex: number | undefined;

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
		if (this.group) {
			this.scene?.remove(this.group);
		}
	}

	setup(scene: THREE.Scene, camera: THREE.Camera): void {
		super.setup(scene, camera);
	}

	setScale(scale: THREE.Vector3): void {
		this.size = scale;
		this.group?.scale.copy(scale);
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
				this.onDataPointSelected(point);
			}
		}

		return [];
	}

	updateWithData(data: PlaneData) {
		if (this.group) {
			this.scene?.remove(this.group);
		}
		const group = new THREE.Group();

		console.log('Size', this.size);
		const sphereGeo = new THREE.SphereGeometry(0.015);

		data.data.forEach((plane, index) => {
			const geo = new DataPlaneShapeGeometry(plane, undefined, false);
			const colorValue = Math.min(Math.random() + 0.2 * index, 1.0);
			const color = new THREE.Color(colorValue * 0xffffff);
			// const color1 = new THREE.Color(colorValue * 0.2 * 0xffffff);
			const mat = new DataPlaneShapeMaterial(
				color,
				color,
				{
					opacity: 0.95,
					transparent: true
					// wireframe: true
				}
				// new THREE.Color((0xffff00 * (index + 1)) / data.data.length),
				// {}
			);
			const mesh = new THREE.Mesh(geo, mat);
			group.add(mesh);

			const pointBuffer = geo.buffer;
			this.depth = geo.planeDims.depth;
			this.width = geo.planeDims.width;
			if (pointBuffer) {
				const sphereMat = new THREE.MeshPhongMaterial({ color: 0xff0000 });
				const dotMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, geo.pointsPerPlane);
				dotMesh.userData = { index };
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
				group.add(dotMesh);
			}

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
		this.group.position.x = this.size.x / 2;
		this.group.position.z = this.size.z / 2;
		this.group.scale.copy(this.size).multiplyScalar(0.5);
		console.log('Scale', this.group.scale);
		// this.group.scale.y = data.scaleY ?? 1;
		this.scene?.add(group);
	}
}
