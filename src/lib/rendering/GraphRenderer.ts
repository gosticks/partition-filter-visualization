import { Object3D, Vector2 } from 'three';

export abstract class GraphRenderer<T = unknown, InstanceMetaInfo = unknown> extends Object3D {
	public scene: THREE.Scene | undefined = undefined;
	public camera: THREE.Camera | undefined = undefined;
	// public size: THREE.Vector3 = new Vector3(1, 1, 1);
	public renderContainer: HTMLElement | undefined = undefined;

	abstract destroy(): void;

	setup(
		renderContainer: HTMLElement,
		scene: THREE.Scene,
		camera: THREE.Camera,
		scale: number = 0.6
	) {
		this.scene = scene;
		this.camera = camera;
		this.renderContainer = renderContainer;

		// Set initial size
		const bounds = renderContainer.getBoundingClientRect();
		// NOTE: apply reasonable scaling for graph may differ per graph implementation
		const size = Math.min(bounds.width, bounds.height) * scale;
		this.scale.set(size, size, size);
		// Center in screen
		this.position.y = -0.5 * size;
		// this.position.x = -0.5 * size;
	}

	/**
	 * Used to update rendering based on data changes
	 * @param data
	 */
	abstract update(data: T, options: unknown, colorPalette?: THREE.ColorRepresentation[]): void;

	abstract selectionAtPoint(glPoint: Vector2): InstanceMetaInfo | undefined;
}
