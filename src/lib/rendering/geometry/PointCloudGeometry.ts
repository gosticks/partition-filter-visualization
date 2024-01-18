import * as THREE from 'three';
import { identity } from './transformers';
import type { Point3D } from './SparsePlaneGeometry';
import { INTERSECTION_CHECK_LAYER } from '../PlaneRenderer';

export class SelectablePointCloud extends THREE.Group {
	private boxMesh?: THREE.InstancedMesh;
	private dotMesh?: THREE.InstancedMesh;

	constructor(
		values: Point3D[],
		color: THREE.Color,
		radius: number,
		hitBoxWidth: number,
		public index: number,
		public childIndex?: number,
		public scaleX: (x: number) => number = identity,
		public scaleY: (y: number) => number = identity,
		public scaleZ: (z: number) => number = identity
	) {
		super();

		const sphere = new THREE.SphereGeometry(radius);
		const sphereMaterial = new THREE.MeshPhongMaterial({
			color: color,
			transparent: true,
			opacity: 0.4
		});

		const hitBox = new THREE.BoxGeometry(hitBoxWidth, hitBoxWidth, hitBoxWidth);
		const hitBoxMaterial = new THREE.MeshPhongMaterial({
			color: color,
			opacity: 0.5
			// transparent: true
		});

		const dotMesh = new THREE.InstancedMesh(sphere, sphereMaterial, values.length);
		const boxMesh = new THREE.InstancedMesh(hitBox, hitBoxMaterial, values.length);
		const matrix = new THREE.Matrix4();

		for (const [i, [x, z, y]] of values.entries()) {
			matrix.setPosition(scaleX(x), scaleY(Number(y)), scaleZ(z));

			// boxMesh.setColorAt(i, transparent)
			dotMesh.setMatrixAt(i, matrix);
			boxMesh.setMatrixAt(i, matrix);
		}

		boxMesh.visible = true;
		boxMesh.layers.set(INTERSECTION_CHECK_LAYER);
		this.layers.set(INTERSECTION_CHECK_LAYER);
		this.add(boxMesh, dotMesh);

		this.boxMesh = boxMesh;
		this.dotMesh = dotMesh;
	}

	public globalPositionOfInstance(instanceId: number): THREE.Vector3 {
		const pos = this.position.clone();
		const mat = new THREE.Matrix4();
		this.dotMesh!.getMatrixAt(instanceId, mat)!;
		return this.localToWorld(pos.applyMatrix4(mat));
	}

	public setHitTest(enabled: boolean) {
		if (enabled) {
			this.boxMesh?.layers.set(INTERSECTION_CHECK_LAYER);
			this.layers.set(INTERSECTION_CHECK_LAYER);
		} else {
			this.boxMesh?.layers.disable(INTERSECTION_CHECK_LAYER);
			this.layers.disable(INTERSECTION_CHECK_LAYER);
		}
	}
}
