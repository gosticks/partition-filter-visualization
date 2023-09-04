export abstract class GraphRenderer<T = unknown> {
	public scene: THREE.Scene | undefined = undefined;
	public camera: THREE.Camera | undefined = undefined;

	public onDataPointSelected: ((point?: THREE.Vector3) => void) | undefined = undefined;

	abstract destroy(): void;

	setup(scene: THREE.Scene, camera: THREE.Camera) {
		this.scene = scene;
		this.camera = camera;
	}

	/**
	 * Used to update rendering based on data changes
	 * @param data
	 */
	abstract updateWithData(data: T): void;

	abstract getIntersections(raycaster: THREE.Raycaster): THREE.Intersection[];

	abstract setScale(scale: THREE.Vector3): void;
}
