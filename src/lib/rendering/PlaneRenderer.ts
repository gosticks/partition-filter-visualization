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
		return raycaster.intersectObjects(this.children, true);
	}

	updateWithData(data: PlaneData) {
		if (this.group) {
			this.scene?.remove(this.group);
		}
		const group = new THREE.Group();

		data.data.forEach((plane, index) => {
			const geo = new DataPlaneShapeGeometry(
				plane,
				index === 0 ? undefined : data.data[index - 1],
				true
			);
			const colorValue = Math.min(Math.random() + 0.2 * index, 1.0);
			const color = new THREE.Color(colorValue * 0xffffff);
			// const color1 = new THREE.Color(colorValue * 0.2 * 0xffffff);
			const mat = new DataPlaneShapeMaterial(
				color,
				color,
				{
					opacity: 0.95,
					transparent: true
				}
				// new THREE.Color((0xffff00 * (index + 1)) / data.data.length),
				// {}
			);
			const mesh = new THREE.Mesh(geo, mat);
			group.add(mesh);
		});
		// const geometry = new DataPlaneShapeGeometry(highestValues, undefined);

		// // Create a material with the custom fragment shader
		// const material = new DataPlaneShapeMaterial(new THREE.Color(0xff00ff));

		// const mesh = new THREE.Mesh(geometry, material);
		// group.add(mesh);

		this.group = group;
		this.group.scale.copy(this.size).multiplyScalar(0.25);
		this.group.scale.y = data.scaleY ?? 1;
		this.scene?.add(group);
	}
}
