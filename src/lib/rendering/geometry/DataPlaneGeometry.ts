import * as THREE from 'three';

export class DataPlaneShapeGeometry extends THREE.BufferGeometry {
	static readonly pointComponentSize = 3;

	private normalizedData: number[][];
	private previousNormalizedData: number[][] | undefined = undefined;
	private width: number;
	private depth: number;

	private indexBuffer: Uint32Array | undefined = undefined;
	private pointBuffer: Float32Array | undefined = undefined;

	public get buffer() {
		return this.pointBuffer;
	}

	public get planeDims() {
		return { width: this.width, depth: this.depth };
	}

	public get pointsPerPlane() {
		return this.width * this.depth;
	}

	private get numPolygonsPerPlane() {
		return (this.width - 1) * (this.depth - 1) * 2;
	}

	constructor(
		data: number[][],
		previousData: number[][] | undefined = undefined,
		normalized = false,
		private drawsSideWalls = false,
		private drawsBottom = false
	) {
		super();
		console.log('create geo', { data, previousData, normalized });
		if (normalized) {
			this.normalizedData = data;
			this.previousNormalizedData = previousData;
		} else {
			// Find max value and normalize all values to be between 0 and 1
			let maxValue = -Infinity;

			data.forEach((row) => {
				row.forEach((value) => {
					maxValue = Math.max(maxValue, value);
				});
			});

			if (maxValue !== 0) {
				this.normalizedData = data.map((row) => row.map((value) => value / maxValue));

				// If previous data is provided, normalize it as well
				if (previousData) {
					this.previousNormalizedData = previousData.map((row) =>
						row.map((value) => value / maxValue)
					);
				}
			} else {
				this.normalizedData = data;
				this.previousNormalizedData = previousData;
			}
		}

		this.width = this.normalizedData[0].length;
		this.depth = this.normalizedData.length;

		if (previousData) {
			if (previousData.length !== this.depth || previousData[0].length !== this.width) {
				throw new Error('Previous data has different dimensions');
			}
		}
		this.computeGeometry();
	}

	/**
	 * Setup buffers for the geometry
	 * - we are using indexed geometry to avoid duplicating vertices
	 */
	private setupBuffers() {
		const { pointsPerPlane, width, depth } = this;
		// Total number of floats in the buffer
		// - Each point has DataPlaneShapeGeometry.pointComponentSize components
		// - Each plane has pointsPerPlane points and we have 2 planes
		const bufferSize =
			pointsPerPlane * (this.drawsBottom ? 2 : 1) * DataPlaneShapeGeometry.pointComponentSize;

		if (!this.pointBuffer) {
			this.pointBuffer = new Float32Array(bufferSize);
		} else if (this.pointBuffer.length !== bufferSize) {
			// Recreate buffer if size changed
			delete this.pointBuffer;
			this.pointBuffer = new Float32Array(bufferSize);
		}
		// All indices for geometry sides (front,back,left,right)
		const numEdgeIndices = this.drawsSideWalls ? (width - 1 + depth - 1) * 2 * 3 * 2 : 0;
		// All indices for geometry top and bottom (top, bottom)
		const numPlaneIndices = this.numPolygonsPerPlane * 3 * (this.drawsBottom ? 2 : 1);
		const numIndices = numEdgeIndices + numPlaneIndices;
		if (!this.indexBuffer) {
			this.indexBuffer = new Uint32Array(numIndices);
		} else if (this.indexBuffer.length !== numIndices) {
			// Recreate buffer if size changed
			delete this.indexBuffer;
			this.indexBuffer = new Uint32Array(numIndices);
		}
	}

	private computeGeometry() {
		const { normalizedData, width, depth, pointsPerPlane } = this;

		this.setupBuffers();

		// Sanity check
		if (this.pointBuffer === undefined || this.indexBuffer === undefined) {
			throw new Error('Buffers not initialized');
		}

		const vertices = this.pointBuffer;
		const indices = this.indexBuffer;

		const bufferElementSize = 3;
		const numPolygons = (width - 1) * (depth - 1) * (this.drawsBottom ? 2 : 1);

		const hasBottomLayer = this.previousNormalizedData !== undefined;

		const polyindicesPerPlane = numPolygons * 3;

		console.log('create geo');

		// Add all points to the geometry
		for (let z = 0; z < depth; z++) {
			for (let x = 0; x < width; x++) {
				const pointIdx = z * width + x;
				const vertexIdx = pointIdx * bufferElementSize;
				const indexIdx = (z * (width - 1) + x) * 6;

				// Add top plane coordinates
				vertices[vertexIdx] = (x / width) * 2.0 - 1.0; //x
				vertices[vertexIdx + 1] = normalizedData[z][x]; //y
				vertices[vertexIdx + 2] = (z / depth) * 2.0 - 1.0; //z

				if (this.drawsBottom) {
					// Add bottom plane coordinates
					vertices[vertexIdx + pointsPerPlane * bufferElementSize] = (x / width) * 2.0 - 1.0; //x
					vertices[vertexIdx + pointsPerPlane * bufferElementSize + 1] = hasBottomLayer
						? this.previousNormalizedData?.[z][x] ?? 0 // syntax enforced by strict null checks (should never happen)
						: 0;
					vertices[vertexIdx + pointsPerPlane * bufferElementSize + 2] = (z / depth) * 2.0 - 1.0; //z
				}

				if (z === depth - 1 || x === width - 1) {
					continue;
				}

				// Add top plane indices
				indices[indexIdx] = pointIdx + width;
				indices[indexIdx + 1] = pointIdx + 1;
				indices[indexIdx + 2] = pointIdx;

				indices[indexIdx + 3] = pointIdx + width;
				indices[indexIdx + 4] = pointIdx + width + 1;
				indices[indexIdx + 5] = pointIdx + 1;

				if (this.drawsBottom) {
					// Add bottom plane indices
					indices[indexIdx + polyindicesPerPlane] = indices[indexIdx] + pointsPerPlane;
					indices[indexIdx + polyindicesPerPlane + 1] = indices[indexIdx + 1] + pointsPerPlane;
					indices[indexIdx + polyindicesPerPlane + 2] = indices[indexIdx + 2] + pointsPerPlane;

					indices[indexIdx + polyindicesPerPlane + 3] = indices[indexIdx + 3] + pointsPerPlane;
					indices[indexIdx + polyindicesPerPlane + 4] = indices[indexIdx + 4] + pointsPerPlane;
					indices[indexIdx + polyindicesPerPlane + 5] = indices[indexIdx + 5] + pointsPerPlane;
				}
			}
		}

		if (this.drawsSideWalls) {
			// Draw walls after top and bottom planes
			const wallIdxOffset = numPolygons * 3 * 2;

			// Draw front & back polygons
			for (let x = 0; x < width - 1; x++) {
				const indexIdx = wallIdxOffset + x * 6;

				// Draw back wall
				indices[indexIdx] = x;
				indices[indexIdx + 1] = x + 1;
				indices[indexIdx + 2] = pointsPerPlane + x;

				indices[indexIdx + 3] = x + 1;
				indices[indexIdx + 4] = pointsPerPlane + x + 1;
				indices[indexIdx + 5] = pointsPerPlane + x;

				const frontWallIdx = wallIdxOffset + (width - 1 + x) * 6;

				// Draw front wall
				indices[frontWallIdx] = pointsPerPlane * 2 - width + x;
				indices[frontWallIdx + 1] = x + 1 + pointsPerPlane - width;
				indices[frontWallIdx + 2] = x + pointsPerPlane - width;

				indices[frontWallIdx + 3] = pointsPerPlane * 2 - width + x;
				indices[frontWallIdx + 4] = pointsPerPlane * 2 - width + x + 1;
				indices[frontWallIdx + 5] = x + 1 + pointsPerPlane - width;
			}

			const sideWallIdxOffset = wallIdxOffset + (width - 1) * 6 * 2;

			// Draw side walls
			for (let z = 0; z < depth - 1; z++) {
				const indexIdx = sideWallIdxOffset + z * 6;

				// Draw left wall
				indices[indexIdx] = z * width;
				indices[indexIdx + 1] = (z + 1) * width;
				indices[indexIdx + 2] = pointsPerPlane + z * width;

				indices[indexIdx + 3] = (z + 1) * width;
				indices[indexIdx + 4] = pointsPerPlane + (z + 1) * width;
				indices[indexIdx + 5] = pointsPerPlane + z * width;

				const rightWallIdx = sideWallIdxOffset + (depth - 1 + z) * 6;
				indices[rightWallIdx] = z * width + width - 1;
				indices[rightWallIdx + 1] = z * width + width - 1 + width;
				indices[rightWallIdx + 2] = pointsPerPlane + z * width + width - 1;

				indices[rightWallIdx + 3] = z * width + width - 1 + width;
				indices[rightWallIdx + 4] = pointsPerPlane + z * width + width - 1 + width;
				indices[rightWallIdx + 5] = pointsPerPlane + z * width + width - 1;
			}
		}
		this.setAttribute(
			'position',
			new THREE.BufferAttribute(vertices, DataPlaneShapeGeometry.pointComponentSize)
		);
		this.setIndex(new THREE.Uint32BufferAttribute(indices, 1));
		this.computeVertexNormals();
	}
}
