import * as THREE from 'three';
import { GraphRenderer } from './GraphRenderer';
import { DataPlaneShapeMaterial } from './materials/DataPlaneMaterial';
import { DataPlaneShapeGeometry } from './geometry/DataPlaneGeometry';

interface PlaneData {
	data: number[][][];
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

	// Getter for all bar blocks managed by the renderer
	get bars(): THREE.Object3D[] {
		return this.group?.children ?? [];
	}

	constructor(
		public scene: THREE.Scene,
		public camera: THREE.Camera,
		options: Partial<PlaneRendererOptions> = {}
	) {
		super(scene, camera);

		this.options = {
			...defaultRendererOptions,
			...options
		};
	}

	destroy(): void {
		if (this.group) {
			this.scene.remove(this.group);
		}
	}

	setScale(scale: THREE.Vector3): void {
		this.size = scale;
		this.group?.scale.copy(scale);
	}

	getIntersections(raycaster: THREE.Raycaster): THREE.Intersection[] {
		return raycaster.intersectObjects(this.bars, true);
	}

	updateWithData(data: PlaneData) {
		if (this.group) {
			this.scene.remove(this.group);
		}
		const group = new THREE.Group();

		// Construct a list of all highest values
		const highestValues = Array.from({ length: data.data.length }, () =>
			Array.from({ length: data.data.length > 0 ? data.data[0].length : 0 }, () => 0)
		);

		let maxValue = -0.0;

		// Compute maxBar height to correctly scale bars
		data.data.forEach((z, zIdx) =>
			z.forEach((x, xIdx) => {
				// FIXME: this is really slow, just use for initial rendering setup
				let height = Math.max(...x);
				if (!Number.isFinite(height)) {
					height = 0;
				}
				highestValues[zIdx][xIdx] = height;
				maxValue = Math.max(maxValue, height);
			})
		);

		const mockupData = highestValues.map((row, z) => row.map((_, x) => highestValues[z][x] * 0.5));

		const geometry = new DataPlaneShapeGeometry(highestValues, undefined);
		const geometry2 = new DataPlaneShapeGeometry(mockupData, undefined, true);

		// Create a material with the custom fragment shader
		const material = new DataPlaneShapeMaterial(new THREE.Color(0xff00ff));
		const material2 = new DataPlaneShapeMaterial(new THREE.Color(0x00ffff));

		const mesh = new THREE.Mesh(geometry, material);
		const mesh2 = new THREE.Mesh(geometry2, material2);
		group.add(mesh);
		// group.add(mesh2);

		this.group = group;
		this.group.position.z = -0.5;
		this.group.scale.copy(this.size).multiplyScalar(0.5);
		this.scene.add(group);
	}

	private createBarSegment(
		width: number,
		height: number,
		depth: number,
		color: THREE.Color
	): THREE.Mesh {
		const geometry = new THREE.BoxGeometry(width, height, depth);
		const material = new THREE.MeshPhongMaterial({ color, transparent: true });

		const bar = new THREE.Mesh(geometry, material);
		return bar;
	}
}
