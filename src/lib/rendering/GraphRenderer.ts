export abstract class GraphRenderer<T = unknown> {
	constructor(public scene: THREE.Scene, public camera: THREE.Camera) {}

	abstract destroy(): void;

	/**
	 * Used to update rendering based on data changes
	 * @param data
	 */
	abstract updateWithData(data: T): void;

	abstract getIntersections(raycaster: THREE.Raycaster): THREE.Intersection[];
}
