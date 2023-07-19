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
}

const defaultBarRendererOptions: BarRendererOptions = {
	barWidth: 1,
	barDepth: 1,
	barGap: 0.1
};

// Define your colors
const color1 = new THREE.Color('#F0F624');
const color2 = new THREE.Color('#C5407D');
const color3 = new THREE.Color('#15078A');

const dataColorizer = (value: number, dataIndex: Vector3, axisProgress: Vector3): THREE.Color => {
	const xColor = color1.clone().lerp(color2, axisProgress.x);
	return xColor.lerp(color3, axisProgress.y);
};

export class BarRenderer extends GraphRenderer<BarData> {
	private barGroup: THREE.Group;
	private options: BarRendererOptions;
	private size: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

	constructor(
		public scene: THREE.Scene,
		public camera: THREE.Camera,
		options: Partial<BarRendererOptions> = {}
	) {
		super(scene, camera);

		this.options = {
			...defaultBarRendererOptions,
			...options
		};

		this.barGroup = new THREE.Group();
		this.scene.add(this.barGroup);
	}

	destroy(): void {
		this.scene.remove(this.barGroup);
	}

	setScale(scale: THREE.Vector3): void {
		this.size = scale;
		this.barGroup.scale.copy(scale);
	}

	updateWithData(data: BarData) {
		// Clear group
		this.barGroup.children = [];

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
						value,
						new THREE.Vector3(x, y, z),
						new THREE.Vector3(
							x / data.data[z][x].length,
							y / data.data[z].length,
							z / data.data.length
						)
					);

					const barSegmentHeight = value / maxBarHeight;

					// Create bar
					const bar = this.createBarSegment(
						// Scale bar to 0 to 1 range
						barSegmentHeight,
						this.options.barWidth,
						this.options.barDepth,
						color
					);

					// Position bar
					bar.position.set(
						this.options.barWidth / 2 + x * (this.options.barWidth + this.options.barGap),
						currentBarHeight + barSegmentHeight / 2,
						this.options.barDepth / 2 + z * (this.options.barWidth + this.options.barGap)
					);

					currentBarHeight += barSegmentHeight;

					// Add bar to group
					this.barGroup.add(bar);
				}
			}
		}
	}

	private createBarSegment(
		height: number,
		width: number,
		depth: number,
		color: THREE.Color
	): THREE.Mesh {
		const geometry = new THREE.BoxGeometry(width, height, depth);
		const material = new THREE.MeshPhongMaterial({ color, transparent: true });

		const bar = new THREE.Mesh(geometry, material);
		return bar;
	}
}
