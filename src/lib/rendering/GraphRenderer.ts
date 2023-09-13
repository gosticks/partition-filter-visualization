import { Vector3 } from 'three';

export abstract class GraphRenderer<T = unknown, InstanceMetaInfo = any> {
	public scene: THREE.Scene | undefined = undefined;
	public camera: THREE.Camera | undefined = undefined;
	public size: THREE.Vector3 = new Vector3(1, 1, 1);
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
		this.size = new Vector3(bounds.width, bounds.width, bounds.width);
	}

	/**
	 * Used to update rendering based on data changes
	 * @param data
	 */
	abstract updateWithData(data: T, colorPalette?: THREE.ColorRepresentation[]): void;

	abstract getIntersections(raycaster: THREE.Raycaster): THREE.Intersection[];

	abstract setScale(scale: THREE.Vector3): void;
}
