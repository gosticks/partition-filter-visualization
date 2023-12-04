import type { Vector3 } from 'three';
import * as THREE from 'three';
import { GraphRenderer } from './GraphRenderer';

interface BarData {
	data: number[][][];
}

interface BarRendererOptions {
	barWidth: number;
	barDepth: number;
	barGap: number;

	// TODO: think about naming
	cols: number;
	rows: number;
}

const defaultBarRendererOptions: BarRendererOptions = {
	barWidth: 0.15,
	barDepth: 0.15,
	barGap: 0.05,

	cols: 10,
	rows: 10
};

// Define your colors
const color1 = new THREE.Color('#F0F624');
const color2 = new THREE.Color('#C5407D');
const color3 = new THREE.Color('#15078A');

const dataColorizer = (dataIndex: Vector3, axisProgress: Vector3): THREE.Color => {
	const xColor = color1.clone().lerp(color2, axisProgress.x);
	return xColor.lerp(color3, axisProgress.y);
};

export class BarRenderer extends GraphRenderer<BarData> {
	private barGroup?: THREE.Group;
	private options: BarRendererOptions;
	private size: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

	// Getter for all bar blocks managed by the renderer
	get bars(): THREE.Object3D[] {
		return this.barGroup?.children ?? [];
	}

	constructor(options: Partial<BarRendererOptions> = {}) {
		super();
		this.options = {
			...defaultBarRendererOptions,
			...options
		};
	}

	destroy(): void {
		if (this.barGroup) {
			this.scene?.remove(this.barGroup);
		}
	}

	setScale(scale: THREE.Vector3): void {
		this.size = scale;
		this.barGroup?.scale.copy(scale);
	}

	setup(scene: THREE.Scene, camera: THREE.Camera): void {
		super.setup(scene, camera);
	}

	getIntersections(raycaster: THREE.Raycaster): THREE.Intersection[] {
		return raycaster.intersectObjects(this.bars, true);
	}

	update(data: BarData) {
		if (this.barGroup) {
			this.scene?.remove(this.barGroup);
		}
		const barGroup = new THREE.Group();

		// Compute min and max values
		let maxBarHeight = -Infinity;

		// Compute maxBar height to correctly scale bars
		data.data.forEach((z) =>
			z.forEach(
				(y) =>
					(maxBarHeight = Math.max(
						y.reduce((a, b) => a + b, 0),
						maxBarHeight
					))
			)
		);

		console.log(maxBarHeight);

		const relBarSize = Math.min(
			(1 - this.options.barGap) / this.options.cols,
			(1 - this.options.barGap) / this.options.rows
		);

		const relGapSize = Math.min(
			this.options.barGap / this.options.cols,
			this.options.barGap / this.options.rows
		);

		// Iterate over input data and create bars
		for (let z = 0; z < data.data.length; z++) {
			for (let x = 0; x < data.data[z].length; x++) {
				let currentBarHeight = 0;

				for (let y = 0; y < data.data[z][x].length; y++) {
					const value = data.data[z][x][y];

					// Sanity check for invalid data
					if (value <= 0) {
						continue;
					}

					const color = dataColorizer(
						new THREE.Vector3(x, y, z),
						new THREE.Vector3(x / this.options.rows, value / maxBarHeight, z / this.options.cols)
					);

					const barSegmentHeight = value / maxBarHeight;

					// Create bar
					const bar = this.createBarSegment(
						relBarSize,
						// Scale bar to 0 to 1 range
						barSegmentHeight,
						relBarSize,
						color
					);

					// Position bar
					bar.position.set(
						relBarSize / 2 + x * (relBarSize + relGapSize),
						currentBarHeight + barSegmentHeight / 2,
						relBarSize / 2 + z * (relBarSize + relGapSize)
					);

					currentBarHeight += barSegmentHeight;

					// Add bar to group
					barGroup.add(bar);
				}
			}
		}
		this.barGroup = barGroup;
		this.barGroup.scale.copy(this.size);
		this.scene?.add(barGroup);
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
