import * as THREE from 'three';

export interface TextTextureOptions {
	color: THREE.ColorRepresentation;
	font: string;
	fontSize: number;
	fontLineHeight: number;
	rotation: number;
}

export class TextTexture extends THREE.CanvasTexture {
	private canvas?: HTMLCanvasElement;
	private context?: CanvasRenderingContext2D;

	constructor(text: string, options: TextTextureOptions) {
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
	}

	dispose(): void {
		this.canvas?.remove();
		super.dispose();
	}
}
