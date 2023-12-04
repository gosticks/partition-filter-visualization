import {Delaunay} from "d3-delaunay";
import * as THREE from "three"
import { identity } from "./transformers";
export type Point2D = [number, number];
export type Point3D = [number, number, number];



// Geometry that only renders polygons between data points
export class SparsePlaneGeometry extends THREE.BufferGeometry {
    static readonly pointComponentSize = 3;

    private d: Delaunay<Point3D>;
    private pointBuffer: Float32Array;

    constructor(
        values: [number, number, number][],
        scaleX: (x: number) => number = identity,
        scaleY: (y: number) => number = identity,
        scaleZ: (z: number) => number = identity,

    ) {
        super();

        // allow typecast since all [number, number, number] can be used as [number, number]
        // given indices 0,1 are equal in both cases
        this.d = Delaunay.from(values as unknown as Point2D[]);

        this.pointBuffer = new Float32Array(values.length * SparsePlaneGeometry.pointComponentSize);
        values.forEach(([x, z, y], idx) => {
            this.pointBuffer[idx * SparsePlaneGeometry.pointComponentSize] = scaleX(x);
            this.pointBuffer[idx * SparsePlaneGeometry.pointComponentSize + 1] = scaleY(y);
            this.pointBuffer[idx * SparsePlaneGeometry.pointComponentSize + 2] = scaleZ(z);
        })

        this.setAttribute("position", new THREE.BufferAttribute(this.pointBuffer, SparsePlaneGeometry.pointComponentSize, true));
        // Create buffers for rendering
        this.setIndex(new THREE.Uint32BufferAttribute(this.d.triangles, 1));
        this.computeVertexNormals();
    }
}