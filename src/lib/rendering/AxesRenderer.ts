import { SingleAxis, Axis, type AxisLabelRenderer, type AxisOptions } from './AxisRenderer';
import * as THREE from 'three';

export interface AxisRendererOptions {
	size: THREE.Vector3;
	labelScale: number;
	origin: THREE.Vector3;
	labelForSegment?: AxisLabelRenderer;
	segments?: number;
	x: AxisOptions;
	y: AxisOptions;
	z: AxisOptions;
}

export const defaultAxisLabelOptions = {
	color: '#cccccc',
	font: 'Courier New',
	fontSize: 100,
	fontLineHeight: 1.2,
	text: ''
};

export const defaultAxisOptions = {
	lineWidth: 2,
	lineColor: 0xcccccc,
	label: defaultAxisLabelOptions
};

export const defaultAxisRendererOptions: AxisRendererOptions = {
	size: new THREE.Vector3(1, 1, 1),
	labelScale: 0.1,
	origin: new THREE.Vector3(0, 0, 0),

	x: {
		...defaultAxisOptions,
		textOptions: {
			...defaultAxisLabelOptions
		},
		labelText: 'X',
		segments: 10,
		segmentSize: 0.5
	},
	y: {
		...defaultAxisOptions,
		textOptions: {
			...defaultAxisLabelOptions
		},
		labelText: 'X',
		labelRotation: Math.PI / 2
	},
	z: {
		...defaultAxisOptions,
		textOptions: {
			...defaultAxisLabelOptions
		},
		labelText: 'Z'
	}
};

export class AxesRenderer extends THREE.Object3D {
	private options: AxisRendererOptions;
	private mapAxis = new Map<Axis, SingleAxis[]>();
	private axesSets: Record<Axis, THREE.Vector3[]> = {
		[Axis.X]: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1)],
		[Axis.Y]: [
			new THREE.Vector3(1, 0, 0),
			new THREE.Vector3(0, 0, 0),
			new THREE.Vector3(1, 0, 1),
			new THREE.Vector3(0, 0, 1)
		],
		[Axis.Z]: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)]
	};

	private labelOffset: THREE.Vector2 = new THREE.Vector2(0.2, 0.2);
	private sectionLabelOffset: THREE.Vector2 = new THREE.Vector2(0.05, 0.05);

	constructor(options: Partial<AxisRendererOptions> = {}) {
		super();

		const initialOptions: AxisRendererOptions = {
			...defaultAxisRendererOptions,
			...options
		};

		this.options = initialOptions;

		this.update(this.options);
	}

	onBeforeRender = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => {
		// hide axes that are in the background
		// TODO: double loop can be avoided
		this.mapAxis.forEach((axisGroup, axisDirection) => {
			const cameraMatrix = camera.matrixWorldInverse;
			let axisByDistance = axisGroup;
			switch (axisDirection) {
				case Axis.Z:
				case Axis.X:
				case Axis.Y: {
					axisByDistance = axisGroup.sort(
						(b, a) =>
							a.position.clone().applyMatrix4(cameraMatrix).z -
							b.position.clone().applyMatrix4(cameraMatrix).z
					);
					break;
				}
			}
			axisByDistance.forEach((axis, index, list) => {
				if (list.length < 2) {
					return;
				}
				if (index !== (Axis.Y === axisDirection ? 1 : 0)) {
					axis.visible = false;
					return;
				}
				axis.visible = true;
				axis.onBeforeRender(renderer, scene, camera);
			});
		});
	};

	private optionsForAxis(axis: Axis): AxisOptions {
		return {
			...defaultAxisRendererOptions[axis],
			labelForSegment: this.options.labelForSegment ?? defaultAxisRendererOptions.labelForSegment,
			labelScale: this.options.labelScale ?? defaultAxisRendererOptions.labelScale,
			...(this.options[axis] ?? {})
		};
	}

	update(_options: Partial<AxisLabelRenderer>) {
		this.clear();
		const options: AxisRendererOptions = {
			...this.options,
			..._options
		};
		this.options = options;
		for (const axis of [Axis.X, Axis.Y, Axis.Z]) {
			this.updateAxis(axis, this.optionsForAxis(axis));
			// options[axis] = axisOptions;

			// const singleAxis = new SingleAxis(axis, axisOptions);
			// this.mapAxis.set(axis, singleAxis);
			// this.add(singleAxis);
		}
	}

	private getLabelOffset(axis: Axis, labelOffset: THREE.Vector2, edgeIndex: number): THREE.Vector3 {
		switch (axis) {
			case Axis.X:
				return new THREE.Vector3(
					0, //labelOffset.x * Math.pow(-1, edgeIndex),
					-labelOffset.y,
					-labelOffset.x * Math.pow(-1, edgeIndex)
				);
			case Axis.Y:
				return new THREE.Vector3(
					labelOffset.x * Math.pow(-1, edgeIndex) * 1,
					0,
					labelOffset.y * (edgeIndex < 2 ? -1 : 1) * 1
				);
			case Axis.Z:
				return new THREE.Vector3(
					-labelOffset.x * Math.pow(-1, edgeIndex),
					-labelOffset.y,
					0 //labelOffset.x * Math.pow(-1, edgeIndex),
				);
		}
	}

	updateAxis(axis: Axis, options: Partial<AxisOptions>) {
		this.options[axis] = {
			...this.options[axis],
			labelScale: options.labelScale ?? defaultAxisRendererOptions.labelScale,
			...options
		};
		if (this.mapAxis.has(axis)) {
			this.mapAxis.get(axis)?.forEach((axis) => axis.removeFromParent());
		}

		this.mapAxis.set(
			axis,
			this.axesSets[axis].map((pos, edgeIdx) => {
				const singleAxis = new SingleAxis(
					axis,
					this.getLabelOffset(axis, this.labelOffset, edgeIdx),
					this.getLabelOffset(axis, this.sectionLabelOffset, edgeIdx).multiplyScalar(
						axis === Axis.Y ? 1.5 : 1
					),
					{
						...this.options[axis],
						labelRotation: (this.options[axis].labelRotation ?? 0) * (2 * edgeIdx + 1)
					}
				);
				singleAxis.position.set(pos.x, pos.y, pos.z);
				this.add(singleAxis);
				return singleAxis;
			})
		);
	}

	setup(): void {
		this.clear();
	}

	destroy(): void {
		this.removeFromParent();
		this.remove();
		this.clear();
	}
}
