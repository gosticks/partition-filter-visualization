import * as THREE from 'three';
import { MeshLine, MeshLineMaterial } from 'three.meshline';

export interface AxisLabelOptions {
	color: THREE.Color;
	font: string;
	fontSize: number;
	fontLineHeight: number;
	text: string;
}

export interface AxisOptions {
	lineWidth: number;
	lineColor: THREE.Color;
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

const defaultAxisLabelOptions = {
	color: new THREE.Color(0xcccccc),
	font: 'Arial',
	fontSize: 100,
	fontLineHeight: 1.2,
	text: ''
};

const defaultAxisOptions = {
	lineWidth: 5,
	lineColor: new THREE.Color(0xeeeeee),
	label: defaultAxisLabelOptions
};

const defaultAxisRendererOptions: AxisRendererOptions = {
	size: new THREE.Vector3(1, 1, 1),
	labelScale: 10,
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

export class AxisRenderer {
	private options: AxisRendererOptions;
	private group: THREE.Group;

	constructor(private scene: THREE.Scene, options: Partial<AxisRendererOptions> = {}) {
		this.options = {
			...defaultAxisRendererOptions,
			...options
		};

		this.group = new THREE.Group();
		this.scene.add(this.group);
		// this.render();
	}

	render(): void {
		this.group.children = [];

		this.group.add(this.createAxis(this.options.x, new THREE.Vector3(1, 0, 0)));
		this.group.add(this.createAxis(this.options.y, new THREE.Vector3(0, 1, 0)));
		this.group.add(this.createAxis(this.options.z, new THREE.Vector3(0, 0, 1)));
	}

	destroy(): void {
		this.group.remove();
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
		label.scale.set(this.options.labelScale, this.options.labelScale, this.options.labelScale);
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
		textContext.fillStyle = options.color.getStyle();

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
