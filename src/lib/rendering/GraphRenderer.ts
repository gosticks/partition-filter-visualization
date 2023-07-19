export abstract class GraphRenderer<T> {
	constructor(public scene: THREE.Scene, public camera: THREE.Camera) {}

	abstract destroy(): void;

	/**
	 * Used to update rendering based on data changes
	 * @param data
	 */
	abstract updateWithData(data: T): void;
}
