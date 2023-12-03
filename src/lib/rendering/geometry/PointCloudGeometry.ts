
import * as THREE from "three";
import { identity } from "./transformers";
import type { Point3D } from "./SparsePlaneGeometry";
import { INTERSECTION_CHECK_LAYER } from "../PlaneRenderer";

export class SelectablePointCloud extends THREE.Group {
    private boxMesh?: THREE.InstancedMesh;
    private dotMesh?: THREE.InstancedMesh;

    public get userData() {
        return this.boxMesh?.userData
    }

    public set userData(userData: any) {
        if (this.boxMesh) {
            this.boxMesh!.userData = userData
        }
    }



    constructor(
        values: Point3D[],
        color: THREE.Color,
        radius: number,
        hitBoxWidth: number,
        public scaleX: (x: number) => number = identity,
        public scaleY: (y: number) => number = identity,
        public scaleZ: (z: number) => number = identity,
        userData: object = {},
    ) {
        super();

        const sphere = new THREE.SphereGeometry(radius);
        const sphereMaterial = new THREE.MeshPhongMaterial({
			color: color,
			depthWrite: false,
			transparent: true,
			opacity: 0.4
		});

		const hitBox = new THREE.BoxGeometry(hitBoxWidth, hitBoxWidth, hitBoxWidth);
        const hitBoxMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
        });

        const dotMesh = new THREE.InstancedMesh(sphere, sphereMaterial, values.length);
        const boxMesh = new THREE.InstancedMesh(
			hitBox,
			hitBoxMaterial,
			values.length
		);
		const matrix = new THREE.Matrix4();

        for (let [i, [x, z, y]] of values.entries()) {
            matrix.setPosition(
               scaleX(x),
               scaleY(y),
               scaleZ(z),
            )

            // boxMesh.setColorAt(i, transparent)
            dotMesh.setMatrixAt(i, matrix);
            boxMesh.setMatrixAt(i, matrix);
        }

        boxMesh.visible = false;
        boxMesh.layers.set(INTERSECTION_CHECK_LAYER)
        boxMesh.userData = userData;

        this.add(boxMesh, dotMesh);

        this.boxMesh = boxMesh;
        this.dotMesh = dotMesh;
    }

}