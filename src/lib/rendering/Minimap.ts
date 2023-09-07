import {
	BoxGeometry,
	Mesh,
	MeshBasicMaterial,
	Object3D,
	OrthographicCamera,
	Scene,
	WebGLRenderer
} from 'three';

const grayColorList = [
	'#2B2B2B', // Charcoal Gray
	'#3E3E3E', // Dark Gray
	'#515151', // Gunmetal Gray
	'#646464', // Medium Dark Gray
	'#777777', // True Gray
	'#8A8A8A', // Medium Gray
	'#9D9D9D', // Silver Gray
	'#B0B0B0', // Light Gray
	'#C3C3C3', // Off White Gray
	'#D6D6D6' // Very Light Gray
];

export class Minimap {
	private scene: Scene;
	private orientationCube: Object3D;
	private renderer: THREE.WebGLRenderer;
	private camera: THREE.Camera;
	private trackedCamera: THREE.Camera | undefined = undefined;

	private stopped = false;

	constructor(element: HTMLElement) {
		const bounds = element.getBoundingClientRect();
		this.camera = new OrthographicCamera(
			bounds.width / -8,
			bounds.width / 8,
			bounds.height / 8,
			bounds.height / -8,
			-bounds.width * 4,
			bounds.width * 4
		);

		this.camera.position.z = Math.min(bounds.width, bounds.height);

		this.scene = new Scene();
		const cubeGeometry = new BoxGeometry(1, 1, 1);

		const materials = [
			new MeshBasicMaterial({ color: grayColorList[4] }),
			new MeshBasicMaterial({ color: grayColorList[5] }),
			new MeshBasicMaterial({ color: grayColorList[6] }),
			new MeshBasicMaterial({ color: grayColorList[7] }),
			new MeshBasicMaterial({ color: grayColorList[8] }),
			new MeshBasicMaterial({ color: grayColorList[9] })
		];

		// const cubeMaterial = new MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
		this.orientationCube = new Mesh(cubeGeometry, materials);
		this.orientationCube.scale.set(20, 20, 20);
		this.scene.add(this.orientationCube);

		// Setup renderer
		this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setClearColor(0x000000, 0);
		this.renderer.setSize(bounds.width, bounds.height);
		element.appendChild(this.renderer.domElement);

		this.startAnimationLoop();
	}

	destroy() {
		this.stopped = true;
	}

	private startAnimationLoop() {
		if (this.stopped) {
			return;
		}

		if (this.trackedCamera) {
			// console.log('rendering');
			this.orientationCube.quaternion.copy(this.trackedCamera.quaternion).conjugate();
			this.orientationCube.up.copy(this.trackedCamera.up);
			this.renderer.render(this.scene, this.camera);
		}
		requestAnimationFrame(this.startAnimationLoop.bind(this));
	}

	public setCurrentCamera(camera: THREE.Camera) {
		this.trackedCamera = camera;
	}
}
