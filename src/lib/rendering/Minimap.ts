import type { Mouse } from '@playwright/test';
import {
	BoxGeometry,
	BufferGeometry,
	Mesh,
	MeshBasicMaterial,
	Object3D,
	OrthographicCamera,
	Raycaster,
	Scene,
	Vector2,
	WebGLRenderer,
	type Face,
	Color,
	Vector3
} from 'three';
import { AxisRenderer } from './AxisRenderer';

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
	private orientationCube: Mesh<BoxGeometry, MeshBasicMaterial[]>;
	private renderer: THREE.WebGLRenderer;
	private camera: THREE.Camera;
	private trackedCamera: THREE.Camera | undefined = undefined;
	private raycaster = new Raycaster();
	private mousePosition: THREE.Vector2 = new Vector2(0, 0);
	private mouseClientPosition: THREE.Vector2 = new Vector2(0, 0);
	private mouseInside = false;
	private stopped = false;

	private previousFaceIndex: number | null = null;

	onCanvasHover(event: MouseEvent) {
		// Normalize mouse position
		const bounds = this.renderer.domElement.getBoundingClientRect();
		this.mouseClientPosition.x = event.clientX - bounds.left;
		this.mouseClientPosition.y = event.clientY - bounds.top;

		this.mousePosition.x = (this.mouseClientPosition.x / bounds.width) * 2 - 1;
		this.mousePosition.y = -(this.mouseClientPosition.y / bounds.height) * 2 + 1.0;
	}
	onCanvasClick(event: MouseEvent) {
		if (this.previousFaceIndex !== null) {
			this.lookAtFace(this.previousFaceIndex);
		}
	}

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

		// Setup event listeners
		element.addEventListener('mousemove', this.onCanvasHover.bind(this));
		element.addEventListener('click', this.onCanvasClick.bind(this));
		element.addEventListener('mouseenter', () => {
			this.mouseInside = true;
		});

		element.addEventListener('mouseleave', () => {
			this.mouseInside = false;
		});

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

	private lookAtFace(cubeFaceIndex: number) {
		let lookDirection: THREE.Vector3 | null = null;
		console.log('Looking at face', cubeFaceIndex);
		switch (cubeFaceIndex) {
			case 0:
				lookDirection = new Vector3(0, 0, -1);
				break;
			case 1:
				lookDirection = new Vector3(-1, 0, 0);
				break;
			case 2:
				lookDirection = new Vector3(0, 1, 0);
				break;
			case 3:
				lookDirection = new Vector3(0, -1, 0);
				break;
			case 4:
				lookDirection = new Vector3(0, 0, 1);
				break;
			case 5:
				lookDirection = new Vector3(0, 0, -1);
				break;
		}
		if (!lookDirection || !this.trackedCamera) {
			return;
		}
		const cameraPosition = lookDirection.multiplyScalar(200);
		this.trackedCamera.position.copy(cameraPosition);
		this.trackedCamera.lookAt(lookDirection);

		// Clear face selection to avoid issues
		this.clearFaceSelection();
	}

	private colorForFaceIndex(faceIndex: number): THREE.ColorRepresentation {
		return grayColorList[4 + faceIndex];
	}
	private clearFaceSelection() {
		if (this.previousFaceIndex !== null) {
			const material = this.orientationCube.material[this.previousFaceIndex];
			const oldColor =
				material.userData.color ?? new Color(this.colorForFaceIndex(this.previousFaceIndex));
			material.color = oldColor;
			material.needsUpdate = true;
			this.previousFaceIndex = null;
		}
	}

	private setFaceSelection(faceIndex: number) {
		// Do nothing if already selected to avoid overwriting old color
		if (this.previousFaceIndex === faceIndex) {
			return;
		}
		const material = this.orientationCube.material[faceIndex];
		const oldColor = material.color;
		if (!material.userData.color) {
			material.userData.color = oldColor;
		}

		material.color = new Color(0xff0000);
		material.needsUpdate = true;
		this.previousFaceIndex = faceIndex;
	}

	private renderFaceSelection() {
		// Check for UI interaction
		if (!this.mouseInside) {
			this.clearFaceSelection();
			return;
		}
		this.raycaster.setFromCamera(this.mousePosition, this.camera);

		const intersects = this.raycaster.intersectObject(this.orientationCube);
		if (
			intersects.length > 0 &&
			intersects[0].object === this.orientationCube &&
			intersects[0].faceIndex !== undefined
		) {
			// convert triangle faces to cube face index
			const cubeFaceIndex = Math.floor(intersects[0].faceIndex / 2);
			if (this.previousFaceIndex !== cubeFaceIndex) {
				this.clearFaceSelection();
			}

			this.setFaceSelection(cubeFaceIndex);

			return;
		}
		if (this.previousFaceIndex !== null) {
			this.clearFaceSelection();
		}
	}

	private startAnimationLoop() {
		if (this.stopped) {
			return;
		}

		if (this.trackedCamera) {
			this.renderFaceSelection();
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
