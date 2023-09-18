import type { DeepPartial } from '$lib/store/filterStore/types';
import * as THREE from 'three';
import { MeshLine, MeshLineMaterial } from 'three.meshline';

export interface AxisLabelOptions {
	color: THREE.ColorRepresentation;
	font: string;
	fontSize: number;
	fontLineHeight: number;
	text: string;
}

export interface AxisOptions {
	lineWidth: number;
	lineColor: THREE.ColorRepresentation;
	label: AxisLabelOptions;
	segments?: number;
	labelForSegment?: (segment: number) => string;
}

export interface AxisRendererOptions {
	size: THREE.Vector3;
	labelScale: number;
	origin: THREE.Vector3;

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
		label: {
			...defaultAxisLabelOptions,
			text: 'x'
		},
		segments: 10
	},
	y: {
		...defaultAxisOptions,
		label: {
			...defaultAxisLabelOptions,
			text: 'y'
		}
	},
	z: {
		...defaultAxisOptions,
		label: {
			...defaultAxisLabelOptions,
			text: 'z'
		}
	}
};

class TextTexture extends THREE.CanvasTexture {
	private canvas?: HTMLCanvasElement;
	private context?: CanvasRenderingContext2D;

	constructor(text: string, options: AxisLabelOptions) {
		// Create a canvas element
		const canvas = document.createElement('canvas');
		canvas.width = text.length * options.fontSize;
		canvas.height = options.fontSize * options.fontLineHeight;

		// Get the 2D rendering context of the canvas
		const context = canvas.getContext('2d');

		if (!context) {
			throw new Error('Failed to create canvas context');
		}

		// Set the font properties
		context.font = `${options.fontSize}px ${options.font}`;

		// Set the text color
		context.fillStyle = new THREE.Color(options.color).getStyle();

		// Set the text alignment and baseline
		context.textAlign = 'center';
		context.textBaseline = 'middle';

		// Calculate the text position in the center of the canvas
		const canvasWidth = canvas.width;
		const canvasHeight = canvas.height;
		const textX = canvasWidth / 2;
		const textY = canvasHeight / 2;

		// Render the text on the canvas
		context.fillText(text, textX, textY);

		// Create a texture from the canvas
		super(canvas);

		this.canvas = canvas;
		this.context = context;

		// TODO: maybe reuse canvas if we update the labels frequently
		// Remove the canvas from the DOM
		// document.removeChild(textCanvas);
	}

	dispose(): void {
		this.canvas?.remove();
		super.dispose();
	}
}

export class AxisRenderer extends THREE.Object3D {
	private options: AxisRendererOptions;

	constructor(options: DeepPartial<AxisRendererOptions> = {}) {
		super();

		const optionsWithDefaults: AxisRendererOptions = {
			...defaultAxisRendererOptions,
			...options,
			x: {
				...defaultAxisRendererOptions.x,
				...(options.x ?? {}),
				label: {
					...defaultAxisRendererOptions.x.label,
					...(options.x?.label ?? {})
				}
			},
			y: {
				...defaultAxisRendererOptions.y,
				...(options.y ?? {}),
				label: {
					...defaultAxisRendererOptions.y.label,
					...(options.y?.label ?? {})
				}
			},
			z: {
				...defaultAxisRendererOptions.z,
				...(options.z ?? {}),
				label: {
					...defaultAxisRendererOptions.z.label,
					...(options.z?.label ?? {})
				}
			}
		};

		this.options = optionsWithDefaults;
		this.render();
	}

	render(): void {
		this.clear();
		this.add(this.createAxis(this.options.x, new THREE.Vector3(1, 0, 0)));
		this.add(this.createAxis(this.options.y, new THREE.Vector3(0, 1, 0)));
		this.add(this.createAxis(this.options.z, new THREE.Vector3(0, 0, 1)));
	}

	destroy(): void {
		this.removeFromParent();
		this.remove();
		this.clear();
	}

	private createAxis = (options: AxisOptions, direction: THREE.Vector3): THREE.Object3D => {
		const axis = new THREE.Group();
		const geometry = new THREE.BufferGeometry().setFromPoints([
			new THREE.Vector3(0, 0, 0),
			direction
		]);
		const meshLine = new MeshLine();
		meshLine.setGeometry(geometry);
		const material = new MeshLineMaterial({
			color: options.lineColor,
			lineWidth: options.lineWidth
		});

		const line = new THREE.Mesh(meshLine.geometry, material);

		// Scale the line along the direction vector to the desired length
		const scaleFactor = direction.clone().multiply(this.options.size.clone());

		// Compute width scale depending on text length

		line.scale.set(scaleFactor.x, scaleFactor.y, scaleFactor.z);
		axis.add(line);

		// Draw line segments
		console.log('!!!Drawing segments', options.segments, scaleFactor);
		if (options.segments) {
			const segmentDirection = direction
				.clone()
				.applyAxisAngle(new THREE.Vector3(1, 0, 1), Math.PI / 2);

			console.log('Segment direction');
			const segmentGap = 1 / (options.segments ?? 1);
			const geometry = new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(0, 0, 0),
				// Get 90 deg angle to direction vector
				new THREE.Vector3(100, 0, 0)
			]);
			for (let i = 0; i <= options.segments; i++) {
				const material = new MeshLineMaterial({
					color: options.lineColor,
					lineWidth: options.lineWidth
				});

				const segmentLine = new THREE.Mesh(geometry, material);

				segmentLine.position.set(0, 0, 0);

				segmentLine.scale.set(scaleFactor.x, scaleFactor.y, scaleFactor.z);

				axis.add(segmentLine);
				const labelText =
					options.labelForSegment?.(i) ?? (i / options.segments).toPrecision(2).toString();
				const textWidth = labelText.length * 0.75;
				const label = new THREE.Sprite(
					new THREE.SpriteMaterial({
						transparent: true,
						depthWrite: false,
						map: new TextTexture(labelText, {
							...options.label,
							fontSize: options.label.fontSize * 0.5
						})
					})
				);

				const labelOffset = direction
					.clone()
					.multiply(this.options.size.clone().multiplyScalar(i / options.segments));

				const sizeScale = 4 / options.segments;
				const nonMainAxisOffset = 0.2 + 0.1 * sizeScale;
				label.position.set(
					labelOffset.x === 0 ? -nonMainAxisOffset * this.options.labelScale : labelOffset.x,
					labelOffset.y === 0 ? -nonMainAxisOffset * this.options.labelScale : labelOffset.y,
					labelOffset.z === 0 ? -nonMainAxisOffset * this.options.labelScale : labelOffset.z
				);
				label.scale
					.set(
						this.options.labelScale * textWidth,
						this.options.labelScale,
						this.options.labelScale
					)
					.multiplyScalar(sizeScale);
				axis.add(label);
			}
		}
		const label = new THREE.Sprite(
			new THREE.SpriteMaterial({
				transparent: true,
				depthWrite: false,
				map: new TextTexture(options.label.text, options.label)
			})
		);

		const labelOffset = direction.clone().multiply(this.options.size.clone().multiplyScalar(0.5));

		label.position.set(
			labelOffset.x === 0 ? -1 * this.options.labelScale : labelOffset.x,
			labelOffset.y === 0 ? -1 * this.options.labelScale : labelOffset.y,
			labelOffset.z === 0 ? -1 * this.options.labelScale : labelOffset.z
		);
		const textWidth = options.label.text.length * 0.75;
		label.scale.set(
			this.options.labelScale * textWidth,
			this.options.labelScale,
			this.options.labelScale
		);
		axis.add(label);

		return axis;
	};
}
