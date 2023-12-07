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
	textOptions?: Partial<TextTextureOptions>;
	labelText: string;
	segments?: number;
	labelScale?: number;
	labelForSegment?: AxisLabelRenderer;
	segmentSize?: number;
	labelRotation?: number;
	segmentLabelRotation?: number;
}

export enum Axis {
	X = 'x',
	Y = 'y',
	Z = 'z'
}

export class SingleAxis extends THREE.Group {
	private static defaultSegmentSize = 0.0005;
	private static defaultLabelSize = 0.001;
	private static fontAspectRation = 3 / 4;

	static directionForAxis(axis: Axis) {
		switch (axis) {
			case Axis.X:
				return new THREE.Vector3(1, 0, 0);
			case Axis.Y:
				return new THREE.Vector3(0, 1, 0);

			case Axis.Z:
				return new THREE.Vector3(0, 0, 1);
		}
	}

	public direction: THREE.Vector3;

	get fontAspectRation() {
		return SingleAxis.fontAspectRation;
	}

	axisMesh?: THREE.Mesh;
	label?: THREE.Sprite;
	segmentLines: THREE.Group = new THREE.Group();
	segmentLabels: THREE.Group = new THREE.Group();

	// edges are indices in clockwise direction starting
	// Axis=x -> back, bottom
	// Axis=y -> left, back (when looking at face X/Y)

	constructor(
		public axis: Axis,
		public labelOffset: THREE.Vector3,
		public segmentLabelOffset: THREE.Vector3,
		public options: AxisOptions
	) {
		super();
		this.axis = axis;
		this.options = options;
		this.direction = SingleAxis.directionForAxis(axis);
		this.update();
	}

	onBeforeRender = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => {
		const cameraDirection = new THREE.Vector3();
		camera.getWorldDirection(cameraDirection);

		// represents the angle to the camera
		const dot = cameraDirection.dot(this.direction.clone().transformDirection(this.matrixWorld));

		// set opacity transparent if too steep
		const opacity = Math.max(1 - Math.pow(Math.abs(dot), 4), 0);
		if (this.label) {
			this.label.material.opacity = opacity;
		}
		this.segmentLabels.children.forEach(
			(child) => ((child as THREE.Sprite).material.opacity = opacity)
		);
	};

	update() {
		this.renderAxisLine();
		this.renderAxisLabel();
		this.renderAxisSegments();
	}

	private renderSegmentLabel(text: string, segmentIndex: number): THREE.Sprite {
		const textWidth = text.length * this.fontAspectRation;
		const numSegments = this.options.segments!;
		const label = new THREE.Sprite(
			new THREE.SpriteMaterial({
				transparent: true,
				depthWrite: false,
				// rotation: Math.PI / 2,
				map: new TextTexture(text, {
					rotation: this.options.segmentLabelRotation,
					...this.options.textOptions,
					fontSize: (this.options.textOptions?.fontSize ?? SingleAxis.defaultSegmentSize) * 1
				})
			})
		);

		const labelOffset = this.direction.clone().multiplyScalar(segmentIndex / numSegments);
		const labelScale = this.options.labelScale ?? SingleAxis.defaultSegmentSize;
		const sizeScale = Math.min(16 / numSegments, 0.4);
		label.position.copy(this.segmentLabelOffset).add(labelOffset);

		label.scale.set(labelScale * textWidth, labelScale, labelScale).multiplyScalar(sizeScale);
		return label;
	}

	private renderAxisSegments() {
		if (!this.options.segments) {
			return;
		}

		// remove old segments
		this.segmentLabels.clear();
		this.segmentLines.clear();

		const segmentLineLength = 0.01;
		const segmentLineDirection = new THREE.Vector3(
			this.segmentLabelOffset.x < 0 ? -1 : this.segmentLabelOffset.x > 0 ? 1 : 0,
			this.segmentLabelOffset.y < 0 ? -1 : this.segmentLabelOffset.y > 0 ? 1 : 0,
			this.segmentLabelOffset.z < 0 ? -1 : this.segmentLabelOffset.z > 0 ? 1 : 0
		).multiplyScalar(segmentLineLength);

		const segmentStep = 1 / this.options.segments;
		for (let i = 0; i <= this.options.segments; i++) {
			// Render segment
			const segmentLabelText = this.labelFormatter(i);

			const geometry = new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(0, 0, 0),
				// Get 90 deg angle to direction vector
				segmentLineDirection.clone().multiplyScalar(segmentLabelText !== null ? 1.5 : 1)
			]);

			const meshLine = new MeshLine();
			meshLine.setGeometry(geometry);

			// Render segments
			const material = new MeshLineMaterial({
				color: this.options.lineColor,
				lineWidth: this.options.lineWidth * (segmentLabelText !== null ? 1 : 0.5)
			});

			const segmentLine = new THREE.Mesh(meshLine.geometry, material);
			const pos = this.direction.clone().multiplyScalar(segmentStep * i);
			segmentLine.position.set(pos.x, pos.y, pos.z);
			this.segmentLines.add(segmentLine);

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

	private renderAxisLabel() {
		if (this.label) {
			this.label.removeFromParent();
		}

		const labelText = this.options.labelText;
		const spriteMaterial = new THREE.SpriteMaterial({
			transparent: true,
			depthWrite: false,
			rotation: this.options.labelRotation,
			map: new TextTexture(labelText, {
				...this.options.textOptions
			})
		});
		const label = new THREE.Sprite(spriteMaterial);
		const labelScale = this.options.labelScale ?? SingleAxis.defaultLabelSize;
		const labelOffset = this.direction.clone().multiplyScalar(0.5);

		label.position.set(this.labelOffset.x, this.labelOffset.y, this.labelOffset.z).add(labelOffset);

		const textWidth = labelText.length * this.fontAspectRation;
		label.scale.set(labelScale * textWidth, labelScale, labelScale);
		this.label = label;
		this.add(label);
	}

	private renderAxisLine() {
		if (this.axisMesh) {
			this.axisMesh.removeFromParent();
		}

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
}
