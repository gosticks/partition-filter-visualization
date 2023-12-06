import * as THREE from 'three';

export interface TextTextureOptions {
	color?: string;
	font: string;
	fontSize: number;
	fontLineHeight: number;
	rotation?: number;
	width?: number;
	height?: number;
	backgroundColor?: string;
	useDocumentColor?: boolean;
}

const defaultTextOptions: TextTextureOptions = {
	color: '#000000',
	fontSize: 14,
	font: 'serif',
	fontLineHeight: 16,
	rotation: 0
};

export class TextTexture extends THREE.CanvasTexture {
	private canvas?: HTMLCanvasElement;
	private context?: CanvasRenderingContext2D;

	constructor(text: string, _options: Partial<TextTextureOptions> = {}) {
		const options = { ...defaultTextOptions, ..._options };
		// Create a canvas element
		const canvas = document.createElement('canvas');
		canvas.width = options.width ?? text.length * options.fontSize;
		canvas.height = options.height ?? options.fontSize * options.fontLineHeight;

		// Get the 2D rendering context of the canvas
		const context = canvas.getContext('2d');

		if (!context) {
			throw new Error('Failed to create canvas context');
		}

		// Set the font properties
		context.font = `${options.fontSize}px ${options.font ?? ''}`;

		// Set the text alignment and baseline
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		// Calculate the text position in the center of the canvas
		const canvasWidth = canvas.width;
		const canvasHeight = canvas.height;
		const textX = canvasWidth / 2;
		const textY = canvasHeight / 2;

		if (options.backgroundColor) {
			context.fillStyle = options.backgroundColor;
			context.fillRect(0, 0, canvas.width, canvas.height);
		}

		// Set the text color
		context.fillStyle = new THREE.Color(options.color).getStyle();

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
