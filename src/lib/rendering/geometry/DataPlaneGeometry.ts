import { BufferAttribute, BufferGeometry, Uint32BufferAttribute } from 'three';

type Data = number[][];
export class DataPlaneShapeGeometry extends BufferGeometry {
	static readonly pointComponentSize = 3;

	private normalizedData: Data;
	private previousNormalizedData: Data | undefined = undefined;
	private dataWidth: number;
	private dataDepth: number;
	public width: number;
	public depth: number;

	// tesselation used to interpolate between data points
	// number of points to insert between two points in input data range
	private tesselationFactor = 0;

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
		data: Data,
		previousData: Data | undefined = undefined,
		normalized = false,
		interpolateZeroes = true,
		private drawsSideWalls = false,
		private drawsBottom = false
	) {
		super();
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
		this.width = 0;
		this.depth = 0;
		this.dataDepth = this.normalizedData[0].length;
		this.dataWidth = this.normalizedData.length;

		if (previousData) {
			if (previousData.length !== this.dataDepth || previousData[0].length !== this.dataWidth) {
				throw new Error('Previous data has different dimensions');
			}
		}

		if (interpolateZeroes) {
			for (let z = 0; z < this.normalizedData.length; z++) {
				for (let x = 0; x < this.normalizedData[z].length; x++) {
					// Only interpolate within surface
					if (
						z < 1 ||
						x < 1 ||
						z >= this.normalizedData.length - 1 ||
						x >= this.normalizedData[z].length - 1
					) {
						continue;
					}

					const value = this.normalizedData[z][x];
					if (value === 0) {
						const interpolatedValue = this.interpolate(this.normalizedData, z, x);
						if (interpolatedValue !== null) {
							this.normalizedData[z][x] = interpolatedValue;
						}
					}
				}
			}
		}
		this.computeGeometry();
	}

	interpolate(matrix: Data, z: number, x: number): number | null {
		// Check for next non zero in row, col direction and diagonal
		if (z < 1 || x < 1 || z >= matrix.length - 1 || x >= matrix[z].length - 1) {
			return matrix[z][x];
		}

		const y = matrix[z][x];
		if (y != 0) {
			return y;
		}

		if (matrix[z - 1][x - 1] !== 0 && matrix[z + 1][x + 1] !== 0) {
			return (matrix[z - 1][x - 1] + matrix[z + 1][x + 1]) / 2;
		}

		if (matrix[z - 1][x] !== 0 && matrix[z + 1][x] !== 0) {
			return (matrix[z - 1][x] + matrix[z + 1][x]) / 2;
		}

		if (matrix[z][x - 1] !== 0 && matrix[z][x + 1] !== 0) {
			return (matrix[z][x - 1] + matrix[z][x + 1]) / 2;
		}

		return null;
	}

	hasNonValueNeighbor(matrix: Data, z: number, x: number, value = 0): boolean {
		// Check for next non zero in row, col direction and diagonal
		if (z < 1 || x < 1 || z >= matrix.length - 1 || x >= matrix[z].length - 1) {
			return false;
		}

		if (matrix[z - 1][x - 1] !== value || matrix[z + 1][x + 1] !== value) {
			return true;
		}

		if (matrix[z - 1][x] !== value || matrix[z + 1][x] !== value) {
			return true;
		}

		if (matrix[z][x - 1] !== value || matrix[z][x + 1] !== value) {
			return true;
		}

		return false;
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

	private interpolate2DArray(
		originalArray: number[][],
		pointsX: number,
		pointsY: number
	): number[][] {
		if (pointsX == 0 && pointsY == 0) {
			return originalArray;
		}

		const originalHeight = originalArray.length;
		const originalWidth = originalArray[0].length;

		const interpolatedHeight = originalHeight + (originalHeight - 1) * pointsY;
		const interpolatedWidth = originalWidth + (originalWidth - 1) * pointsX;

		// Initialize the interpolated array with predefined size
		const interpolatedArray: number[][] = new Array(interpolatedHeight)
			.fill(null)
			.map(() => new Array(interpolatedWidth).fill(0));

		// Function to linearly interpolate between two values
		function linearInterpolate(value1: number, value2: number, factor: number): number {
			return value1 + (value2 - value1) * factor;
		}

		for (let y = 0; y < originalHeight - 1; y++) {
			for (let x = 0; x < originalWidth - 1; x++) {
				for (let dy = 0; dy <= pointsY; dy++) {
					for (let dx = 0; dx <= pointsX; dx++) {
						const interpolatedValue = linearInterpolate(
							linearInterpolate(originalArray[y][x], originalArray[y][x + 1], dx / pointsX),
							linearInterpolate(originalArray[y + 1][x], originalArray[y + 1][x + 1], dx / pointsX),
							dy / pointsY
						);

						if (!interpolatedArray[y * (pointsY + 1) + dy]) {
							interpolatedArray[y * (pointsY + 1) + dy] = [];
						}

						interpolatedArray[y * (pointsY + 1) + dy][x * (pointsX + 1) + dx] = interpolatedValue;
					}
				}
			}
		}

		return interpolatedArray;
	}

	private computeGeometry() {
		const { normalizedData: origData, width: origWidth, depth: origDepth } = this;

		const tesselationFactor = Math.max(Math.round(this.tesselationFactor), 0);
		const normalizedData = this.interpolate2DArray(origData, tesselationFactor, tesselationFactor);
		this.width = normalizedData.length;
		this.depth = normalizedData[0].length;

		this.setupBuffers();

		// Sanity check
		if (this.pointBuffer === undefined || this.indexBuffer === undefined) {
			throw new Error('Buffers not initialized');
		}

		const width = this.width;
		const depth = this.depth;
		const pointsPerPlane = width * depth;
		const vertices = this.pointBuffer;
		const indices = this.indexBuffer;

		const bufferElementSize = 3;
		const numPolygons = (width - 1) * (depth - 1) * (this.drawsBottom ? 2 : 1);

		const hasBottomLayer = this.previousNormalizedData !== undefined;

		const polyIndicesPerPlane = numPolygons * 3;

		// Add all points to the geometry
		for (let z = 0; z < depth; z++) {
			for (let x = 0; x < width; x++) {
				const pointIdx = z * width + x;
				const vertexIdx = pointIdx * bufferElementSize;
				const indexIdx = (z * (width - 1) + x) * 6;

				const yAxisValue = normalizedData[z][x];

				// Add top plane coordinates
				vertices[vertexIdx] = x / (width - 1); //x
				vertices[vertexIdx + 1] = normalizedData[z][x]; //y
				vertices[vertexIdx + 2] = z / (depth - 1); //z

				if (this.drawsBottom) {
					// Add bottom plane coordinates
					vertices[vertexIdx + pointsPerPlane * bufferElementSize] = x / (width - 1); //x
					vertices[vertexIdx + pointsPerPlane * bufferElementSize + 1] = hasBottomLayer
						? this.previousNormalizedData?.[z][x] ?? 0 // syntax enforced by strict null checks (should never happen)
						: 0;
					vertices[vertexIdx + pointsPerPlane * bufferElementSize + 2] = z / (depth - 1); //z
				}

				if (yAxisValue == 0 && !this.hasNonValueNeighbor(normalizedData, z, x)) {
					continue;
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
					indices[indexIdx + polyIndicesPerPlane] = indices[indexIdx] + pointsPerPlane;
					indices[indexIdx + polyIndicesPerPlane + 1] = indices[indexIdx + 1] + pointsPerPlane;
					indices[indexIdx + polyIndicesPerPlane + 2] = indices[indexIdx + 2] + pointsPerPlane;

					indices[indexIdx + polyIndicesPerPlane + 3] = indices[indexIdx + 3] + pointsPerPlane;
					indices[indexIdx + polyIndicesPerPlane + 4] = indices[indexIdx + 4] + pointsPerPlane;
					indices[indexIdx + polyIndicesPerPlane + 5] = indices[indexIdx + 5] + pointsPerPlane;
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
			new BufferAttribute(vertices, DataPlaneShapeGeometry.pointComponentSize)
		);
		this.setIndex(new Uint32BufferAttribute(indices, 1));
		this.computeVertexNormals();
	}
}
