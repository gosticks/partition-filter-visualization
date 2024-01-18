import { Delaunay } from 'd3-delaunay';
import * as THREE from 'three';
import { identity } from './transformers';
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
		addsBoundPointsToDelaunay = true // if enabled bounding points are added to the delaunay triangulation. In most cases this removes strange rendering when gaps between points are large
	) {
		super();

		let minX = Number.MAX_VALUE,
			maxX = -1,
			minZ = Number.MAX_VALUE,
			maxZ = -1;
		this.pointBuffer = new Float32Array(
			(values.length + (addsBoundPointsToDelaunay ? 8 : 0)) * SparsePlaneGeometry.pointComponentSize
		);

		values.forEach(([x, z, y], idx) => {
			if (addsBoundPointsToDelaunay) {
				if (x < minX) {
					minX = x;
				}
				if (x > maxX) {
					maxX = x;
				}
				if (z < minZ) {
					minZ = z;
				}
				if (z > maxZ) {
					maxZ = z;
				}
			}
			this.pointBuffer[idx * SparsePlaneGeometry.pointComponentSize] = scaleX(x);
			this.pointBuffer[idx * SparsePlaneGeometry.pointComponentSize + 1] = scaleY(Number(y));
			this.pointBuffer[idx * SparsePlaneGeometry.pointComponentSize + 2] = scaleZ(z);
		});

		const mid = (a: number, b: number) => (a + b) / 2;

		const midPoint = ([x, z]: Point2D, [x2, z2]: Point2D) => [mid(x, x2), mid(z, z2)] as Point2D;

		if (addsBoundPointsToDelaunay) {
			this.d = Delaunay.from([
				...(values as unknown as Point2D[]),
				[minX, minZ],
				[minX, maxZ],
				[maxX, minZ],
				[maxX, maxZ],
				midPoint([minX, minZ], [maxX, minZ]),
				midPoint([minX, maxZ], [maxX, maxZ]),
				midPoint([minX, minZ], [minX, maxZ]),
				midPoint([maxX, minZ], [maxX, maxZ])
			]);
		} else {
			this.d = Delaunay.from(values as unknown as Point2D[]);
		}

		// compute delaunay and cull geometry linking
		// to artificially added corner points
		// IDEA: if performance is affected
		// use a shader to cull triangles with special values for Y
		const triangles = this.d.triangles;
		const filteredTriangles: number[] = [];
		if (addsBoundPointsToDelaunay) {
			for (let i = 0; i < triangles.length; i += 3) {
				if (
					triangles[i] >= values.length ||
					triangles[i + 1] >= values.length ||
					triangles[i + 2] >= values.length
				) {
					continue;
				}
				filteredTriangles.push(triangles[i], triangles[i + 1], triangles[i + 2]);
			}
		}

		this.setAttribute(
			'position',
			new THREE.BufferAttribute(this.pointBuffer, SparsePlaneGeometry.pointComponentSize, true)
		);
		// Create buffers for rendering
		this.setIndex(
			new THREE.Uint32BufferAttribute(addsBoundPointsToDelaunay ? filteredTriangles : triangles, 1)
		);
		this.computeVertexNormals();
	}
}
