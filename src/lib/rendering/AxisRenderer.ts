import type { DeepPartial } from '$lib/store/filterStore/types';
import * as THREE from 'three';
import { MeshLine, MeshLineMaterial } from 'three.meshline';
import { TextTexture, type TextTextureOptions } from './textures/TextTexture';

// custom label renderer
// the following behavouir is expected:
// - Returns string -> string will be rendered
// - Returns null -> Nothing will be rendered
// - Returns undefined -> default renderer used
export type AxisLabelRenderer = (
	axis: Axis,
	segment: number,
	totalSegments: number
) => string | null | undefined;

export interface AxisOptions {
	lineWidth: number;
	lineColor: THREE.ColorRepresentation;
	textOptions: TextTextureOptions;
	labelText: string;
	segments?: number;
	labelScale?: number;
	labelForSegment?: AxisLabelRenderer;
	segmentSize?: number;
}

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

export enum Axis {
	X = 'x',
	Y = 'y',
	Z = 'z'
}

export const defaultAxisLabelOptions = {
	color: 0xcccccc,
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

const defaultAxisRendererOptions: AxisRendererOptions = {
	size: new THREE.Vector3(1, 1, 1),
	labelScale: 0.1,
	origin: new THREE.Vector3(0, 0, 0),

	x: {
		...defaultAxisOptions,
		textOptions: {
			...defaultAxisLabelOptions
		},
		labelText: 'X',
		segments: 10
	},
	y: {
		...defaultAxisOptions,
		textOptions: {
			...defaultAxisLabelOptions
		},
		labelText: 'X'
	},
	z: {
		...defaultAxisOptions,
		textOptions: {
			...defaultAxisLabelOptions
		},
		labelText: 'Z'
	}
};

export class SingleAxis extends THREE.Group {
	private static defaultSegmentSize = 0.0005;
	private static defaultLabelSize = 0.001;
	private static fontAspectRation = 3 / 4;

	private options: AxisOptions;
	private direction: THREE.Vector3;
	private axis: Axis;

	axisMesh?: THREE.Mesh;
	label?: THREE.Sprite;
	segmentLines: THREE.Group = new THREE.Group();
	segmentLabels: THREE.Group = new THREE.Group();

	constructor(axis: Axis, options: AxisOptions) {
		super();
		this.axis = axis;
		this.options = options;
		switch (axis) {
			case Axis.X:
				this.direction = new THREE.Vector3(1, 0, 0);
				break;
			case Axis.Y:
				this.direction = new THREE.Vector3(0, 1, 0);
				break;
			case Axis.Z:
				this.direction = new THREE.Vector3(0, 0, 1);
				break;
		}

		this.createAxis();
		this.renderAxisSegments();
	}

	onBeforeRender = (
		renderer: THREE.WebGLRenderer,
		scene: THREE.Scene,
		camera: THREE.Camera,
		geometry: THREE.BufferGeometry<THREE.NormalBufferAttributes>,
		material: THREE.Material,
		group: THREE.Group
	) => {
		const cameraDirection = new THREE.Vector3();
		camera.getWorldDirection(cameraDirection);
		const defaultNormal = this.direction;
		// make labels transparent when angle is too sharp
		const gridNormal = defaultNormal.clone().transformDirection(this.matrixWorld);
		const dot = cameraDirection.dot(gridNormal);
		const opacity = Math.max(1 - Math.pow(Math.abs(dot), 2), 0);
		// TODO: if the leads to performance issues use other method
		this.segmentLabels.children.forEach(
			(child) => ((child as THREE.Sprite).material.opacity = opacity)
		);
	};

	get fontAspectRation() {
		return SingleAxis.fontAspectRation;
	}

	private createAxis() {
		const geometry = new THREE.BufferGeometry().setFromPoints([
			new THREE.Vector3(0, 0, 0),
			this.direction
		]);
		const meshLine = new MeshLine();
		meshLine.setGeometry(geometry);
		const material = new MeshLineMaterial({
			color: this.options.lineColor,
			lineWidth: this.options.lineWidth
		});

		const line = new THREE.Mesh(meshLine.geometry, material);

		this.axisMesh = line;
		this.add(line);

		const spriteMaterial = new THREE.SpriteMaterial({
			transparent: true,
			depthWrite: false,
			map: new TextTexture(this.options.labelText, this.options.textOptions)
		});

		const label = new THREE.Sprite(spriteMaterial);
		const labelScale = this.options.labelScale ?? SingleAxis.defaultLabelSize;
		const labelOffset = this.direction.clone().multiplyScalar(0.5);

		label.position.set(
			labelOffset.x === 0 ? -labelScale : labelOffset.x,
			labelOffset.y === 0 ? -labelScale : labelOffset.y,
			labelOffset.z === 0 ? -labelScale : labelOffset.z
		);

		const textWidth = this.options.labelText.length * this.fontAspectRation;
		if (this.axis === Axis.Y) {
			// FIXME: use rotation instead of magic constant
			label.position.x = -0.1 - textWidth * 0.05;
		}

		label.scale.set(labelScale * textWidth, labelScale, labelScale);
		this.label = label;
		this.add(label);
	}

	renderSegmentLabel(text: string, segmentIndex: number): THREE.Sprite {
		const textWidth = text.length * this.fontAspectRation;
		const numSegments = this.options.segments!;
		const label = new THREE.Sprite(
			new THREE.SpriteMaterial({
				transparent: true,
				depthWrite: false,
				map: new TextTexture(text, {
					...this.options.textOptions,
					fontSize: this.options.textOptions.fontSize * 0.5
				})
			})
		);

		const labelOffset = this.direction.clone().multiplyScalar(segmentIndex / numSegments);

		const labelScale = this.options.labelScale ?? SingleAxis.defaultSegmentSize;

		const sizeScale = 4 / numSegments;
		const nonMainAxisOffset = (this.axis === Axis.Y ? 0.7 : 0.2) + 0.1 * sizeScale;
		label.position.set(
			labelOffset.x === 0 ? -nonMainAxisOffset * labelScale : labelOffset.x,
			labelOffset.y === 0 ? -nonMainAxisOffset * labelScale : labelOffset.y,
			labelOffset.z === 0 ? -nonMainAxisOffset * labelScale : labelOffset.z
		);
		label.scale.set(labelScale * textWidth, labelScale, labelScale).multiplyScalar(sizeScale);
		return label;
	}

	private labelFormatter(segmentIndex: number) {
		if (!this.options.segments) {
			return '';
		}

		if (this.options.labelForSegment) {
			const label = this.options.labelForSegment(this.axis, segmentIndex, this.options.segments);
			if (label !== undefined) {
				return label;
			}
		}

		return (segmentIndex / this.options.segments).toPrecision(2).toString();
	}

	renderAxisSegments() {
		if (!this.options.segments) {
			return;
		}

		// remove old segments
		this.segmentLabels.clear();
		this.segmentLines.clear();

		const geometry = new THREE.BufferGeometry().setFromPoints([
			new THREE.Vector3(0, 0, 0),
			// Get 90 deg angle to direction vector
			new THREE.Vector3(1, 0, 0)
		]);

		for (let i = 0; i <= this.options.segments; i++) {
			// Render segments
			const material = new MeshLineMaterial({
				color: this.options.lineColor,
				lineWidth: this.options.lineWidth
			});

			const segmentLine = new THREE.Mesh(geometry, material);

			segmentLine.position.set(0, 0, 0);
			// segmentLine.scale.set(scale.x, scale.y, scale.z);
			this.segmentLines.add(segmentLine);

			// Render segment
			const segmentLabelText = this.labelFormatter(i);

			// if label renderer returns undefined
			if (segmentLabelText === null) {
				continue;
			}
			const segmentLabel = this.renderSegmentLabel(segmentLabelText, i);
			this.segmentLabels.add(segmentLabel);
		}

		this.add(this.segmentLabels);
		this.add(this.segmentLines);
	}
}
export class AxisRenderer extends THREE.Object3D {
	private options: AxisRendererOptions;
	private mapAxis = new Map<Axis, SingleAxis>();

	constructor(options: Partial<AxisRendererOptions> = {}) {
		super();

		const initialOptions: AxisRendererOptions = {
			...defaultAxisRendererOptions
		};

		for (const axis of [Axis.X, Axis.Y, Axis.Z]) {
			const axisOptions: AxisOptions = {
				...defaultAxisRendererOptions[axis],
				labelForSegment: options.labelForSegment ?? defaultAxisRendererOptions.labelForSegment,
				labelScale: options.labelScale ?? defaultAxisRendererOptions.labelScale,
				...(options[axis] ?? {})
			};
			initialOptions[axis] = axisOptions;

			const singleAxis = new SingleAxis(axis, axisOptions);
			this.mapAxis.set(axis, singleAxis);
			this.add(singleAxis);
		}
		this.options = initialOptions;
	}

	onBeforeRender = (
		renderer: THREE.WebGLRenderer,
		scene: THREE.Scene,
		camera: THREE.Camera,
		geometry: THREE.BufferGeometry<THREE.NormalBufferAttributes>,
		material: THREE.Material,
		group: THREE.Group
	) => {
		this.mapAxis.forEach((axisObj) =>
			axisObj.onBeforeRender(renderer, scene, camera, geometry, material, group)
		);
	};

	setup(): void {
		this.clear();
	}

	destroy(): void {
		this.removeFromParent();
		this.remove();
		this.clear();
	}
}
