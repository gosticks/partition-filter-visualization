import { Object3D, Vector3 } from 'three';

export abstract class GraphRenderer<T = unknown, InstanceMetaInfo = any> extends Object3D {
	public scene: THREE.Scene | undefined = undefined;
	public camera: THREE.Camera | undefined = undefined;
	// public size: THREE.Vector3 = new Vector3(1, 1, 1);
	public renderContainer: HTMLElement | undefined = undefined;

	public onDataPointSelected:
		| ((point?: THREE.Vector3, info?: InstanceMetaInfo) => void)
		| undefined = undefined;

	abstract destroy(): void;

	setup(renderContainer: HTMLElement, scene: THREE.Scene, camera: THREE.Camera) {
		this.scene = scene;
		this.camera = camera;
		this.renderContainer = renderContainer;

		// Set initial size
		const bounds = renderContainer.getBoundingClientRect();
		// NOTE: apply reasonable scaling for graph may differ per graph implementation
		const size = Math.min(bounds.width, bounds.height) * 0.6;
		this.scale.set(size, size, size);
		// Center in screen
		this.position.y = -0.5 * size;
		// this.position.x = -0.5 * size;
	}

	/**
	 * Used to update rendering based on data changes
	 * @param data
	 */
	abstract updateWithData(data: T, colorPalette?: THREE.ColorRepresentation[]): void;

	abstract getIntersections(raycaster: THREE.Raycaster): THREE.Intersection[];
}
