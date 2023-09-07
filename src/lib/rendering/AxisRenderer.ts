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
}

export interface AxisRendererOptions {
	size: THREE.Vector3;
	labelScale: number;
	origin: THREE.Vector3;

	x: AxisOptions;
	y: AxisOptions;
	z: AxisOptions;
}

export const defaultAxisLabelOptions = {
	color: 0xcccccc,
	font: 'Arial',
	fontSize: 100,
	fontLineHeight: 1.2,
	text: ''
};

export const defaultAxisOptions = {
	lineWidth: 5,
	lineColor: 0xeeeeee,
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
		}
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

		const label = new THREE.Sprite(
			new THREE.SpriteMaterial({
				transparent: true,
				map: this.createTextTexture(options.label)
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

	private createTextTexture(options: AxisLabelOptions): THREE.Texture | null {
		let textCanvas: HTMLCanvasElement | undefined = undefined;
		let textContext: CanvasRenderingContext2D | undefined = undefined;
		// Create a canvas element
		const canvas = document.createElement('canvas');
		canvas.width = options.text.length * options.fontSize;
		canvas.height = options.fontSize * options.fontLineHeight;

		// Get the 2D rendering context of the canvas
		const context = canvas.getContext('2d');

		if (!context) {
			return null;
		}

		textCanvas = canvas;
		textContext = context;

		// Set the font properties
		textContext.font = `${options.fontSize}px ${options.font}`;

		// Set the text color
		textContext.fillStyle = new THREE.Color(options.color).getStyle();

		// Set the text alignment and baseline
		textContext.textAlign = 'center';
		textContext.textBaseline = 'middle';

		// Calculate the text position in the center of the canvas
		const canvasWidth = textCanvas.width;
		const canvasHeight = textCanvas.height;
		const textX = canvasWidth / 2;
		const textY = canvasHeight / 2;

		// Render the text on the canvas
		textContext.fillText(options.text, textX, textY);

		// Create a texture from the canvas
		const texture = new THREE.CanvasTexture(textCanvas);

		// TODO: maybe reuse canvas if we update the labels frequently
		// Remove the canvas from the DOM
		// document.removeChild(textCanvas);

		return texture;
	}
}
