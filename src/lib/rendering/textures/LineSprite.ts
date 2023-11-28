import * as THREE from 'three';

export class LineSprite extends THREE.Sprite {
	private canvas: HTMLCanvasElement;
	private context: CanvasRenderingContext2D;

	constructor(
		public lineColor: string | CanvasGradient | CanvasPattern,
		public lineWidth: number = 1,
		public width: number = 1,
		public height: number = 1
	) {
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');

		if (!context) {
			throw new Error('Failed to create canvas context');
		}

		// Set the canvas dimensions (e.g., 64x64)
		const canvasWidth = 64;
		const canvasHeight = 64;
		canvas.width = canvasWidth;
		canvas.height = canvasHeight;

		// Draw a simple line on the canvas
		context.strokeStyle = lineColor; // Line color
		context.lineWidth = lineWidth; // Line width
		context.beginPath();
		context.moveTo(0, canvasHeight / 2);
		context.lineTo(canvasWidth, canvasHeight / 2);
		context.stroke();

		const texture = new THREE.Texture(canvas);
		texture.needsUpdate = true;
		texture.minFilter = THREE.NearestFilter;
		texture.magFilter = THREE.NearestFilter;
		const material = new THREE.SpriteMaterial({
			map: texture
		});
		super(material);

		this.canvas = canvas;
		this.context = context;
	}

	dispose(): void {
		this.canvas?.remove();
	}
}
