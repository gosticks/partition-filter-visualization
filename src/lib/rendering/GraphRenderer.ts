export abstract class GraphRenderer<T = unknown, InstanceMetaInfo = any> {
	public scene: THREE.Scene | undefined = undefined;
	public camera: THREE.Camera | undefined = undefined;

	public onDataPointSelected:
		| ((point?: THREE.Vector3, info?: InstanceMetaInfo) => void)
		| undefined = undefined;

	abstract destroy(): void;

	setup(scene: THREE.Scene, camera: THREE.Camera) {
		this.scene = scene;
		this.camera = camera;
	}

	/**
	 * Used to update rendering based on data changes
	 * @param data
	 */
	abstract updateWithData(data: T, colorPalette: THREE.ColorRepresentation[]): void;

	abstract getIntersections(raycaster: THREE.Raycaster): THREE.Intersection[];

	abstract setScale(scale: THREE.Vector3): void;
}
