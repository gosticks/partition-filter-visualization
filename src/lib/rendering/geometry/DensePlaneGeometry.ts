import * as THREE from "three"
import { identity } from "./transformers";
export type Point2D = [number, number];
export type Point3D = [number, number, number];


export class DensePlaneGeometry extends THREE.BufferGeometry {
    static readonly pointComponentSize = 3;

    private pointBuffer: Float32Array;

    constructor(
        values: [number, number, number][],
        scaleX: (x: number) => number = identity,
        scaleY: (y: number) => number = identity,
        scaleZ: (z: number) => number = identity,
        skipsEmptyCells: boolean = false
    ) {
        super();

        const [width, depth] = values.reduce(([w, d], [x,z,_]) => [Math.max(w,x), Math.max(d,z)], [0,0])

        console.debug(width, depth);

        // Transform rows into a 2D array for display
        // const data: number[][] = new Array(width).fill(-1).map(() => new Array(depth).fill(-1));
        this.pointBuffer = new Float32Array(width * depth * 3).fill(-1);

        // set points in dense arr
        values.forEach(([x,z,y]) => {
            this.pointBuffer[(x + z * depth) * DensePlaneGeometry.pointComponentSize] = scaleX(x);
            this.pointBuffer[(x + z * depth) * DensePlaneGeometry.pointComponentSize + 1] = scaleY(y);
            this.pointBuffer[(x + z * depth) * DensePlaneGeometry.pointComponentSize + 2] = scaleZ(z);
        });

        // TODO: interpolate holes in data


        // construct polygons
        const numPolygons = (width - 1) * (depth - 1) * 2 * 3;
        const triangleIndexBuffer = new Uint32Array(numPolygons);


		for (let z = 0; z < depth; z++) {
			for (let x = 0; x < width; x++) {
                const pointIdx = z * width + x;
				const vertexIdx = pointIdx * DensePlaneGeometry.pointComponentSize;
				const indexIdx = (z * (width - 1) + x) * 6;
                // console.log({x, z, pointIdx, vertexIdx, indexIdx});
				// Add top plane coordinates
				this.pointBuffer[vertexIdx] = x; //x
				// this.pointBuffer[vertexIdx + 1] = 5;//normalizedData[z][x]; //y
				this.pointBuffer[vertexIdx + 2] = z; //z

                if (this.pointBuffer[vertexIdx + 1] == -1) {
                    if (skipsEmptyCells) {
                        continue;
                    }

                    this.pointBuffer[vertexIdx + 1] = 0;
                }
                triangleIndexBuffer[indexIdx] = pointIdx + width;
				triangleIndexBuffer[indexIdx + 1] = pointIdx + 1;
				triangleIndexBuffer[indexIdx + 2] = pointIdx;

				triangleIndexBuffer[indexIdx + 3] = pointIdx + width;
				triangleIndexBuffer[indexIdx + 4] = pointIdx + width + 1;
				triangleIndexBuffer[indexIdx + 5] = pointIdx + 1;
            }
        }


        this.setAttribute("position", new THREE.BufferAttribute(this.pointBuffer, DensePlaneGeometry.pointComponentSize, true));
        // Create buffers for rendering
        this.setIndex(new THREE.Uint32BufferAttribute(triangleIndexBuffer, 1));
        this.computeVertexNormals();
    }
}