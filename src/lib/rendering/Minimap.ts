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
	Vector3,
	TubeGeometry,
	CurvePath,
	Curve,
	CylinderGeometry,
	Euler,
	DirectionalLight,
	TetrahedronGeometry,
	SphereGeometry,
	EdgesGeometry,
	LineSegments,
	LineBasicMaterial
} from 'three';
import { AxisRenderer } from './AxisRenderer';
import * as THREE from 'three';

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
	private orientationCube?: Mesh<BoxGeometry, MeshBasicMaterial[]>;
	private orientationEdges?: THREE.Group;
	private renderer: THREE.WebGLRenderer;
	private camera: THREE.Camera;
	private trackedCamera: THREE.Camera | undefined = undefined;
	private raycaster = new Raycaster();
	private mousePosition: THREE.Vector2 = new Vector2(0, 0);
	private mouseClientPosition: THREE.Vector2 = new Vector2(0, 0);
	private mouseInside = false;
	private stopped = false;
	private cubeSize = 20;
	private bevelSize = 0.075;

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

	// round-edged box
	createBoxWithRoundedEdges(
		width: number,
		height: number,
		depth: number,
		r: number,
		smoothness: number
	) {
		const shape = new THREE.Shape();
		const eps = 0.00001;
		const radius = r - eps;
		shape.absarc(eps, eps, eps, -Math.PI / 2, -Math.PI, true);
		shape.absarc(eps, height - radius * 2, eps, Math.PI, Math.PI / 2, true);
		shape.absarc(width - radius * 2, height - radius * 2, eps, Math.PI / 2, 0, true);
		shape.absarc(width - radius * 2, eps, eps, 0, -Math.PI / 2, true);
		const geometry = new THREE.ExtrudeGeometry(shape, {
			//   amount: depth - radius0 * 2,
			bevelEnabled: true,
			bevelSegments: 1,
			steps: 1,
			bevelSize: radius,
			bevelThickness: r,
			curveSegments: smoothness
		});

		geometry.center();

		return geometry;
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
			new MeshBasicMaterial({ color: grayColorList[8] }),
			new MeshBasicMaterial({ color: grayColorList[8] }),
			new MeshBasicMaterial({ color: grayColorList[8] }),
			new MeshBasicMaterial({ color: grayColorList[8] }),
			new MeshBasicMaterial({ color: grayColorList[8] }),
			new MeshBasicMaterial({ color: grayColorList[8] })
		];
		this.orientationCube = new Mesh(cubeGeometry, materials);
		this.orientationCube.scale.multiplyScalar(this.cubeSize);
		this.scene.add(this.orientationCube);
		const bevelSize = 0.075;

		// Create beveled edge for one edge (as an example)
		const edgeShape = new THREE.Shape();
		edgeShape.moveTo(0, 0);
		edgeShape.lineTo(bevelSize, 0);
		edgeShape.lineTo(0.0, bevelSize);
		edgeShape.lineTo(0, 0);

		const extrudeSettings = {
			steps: 1,
			depth: 1,
			bevelEnabled: false
		};

		const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

		const colors = [
			0xff0000, // front top edge
			0x00ff00, // back top edge
			0x0000ff, // left top edge
			0xffff00, // right top edge
			0xff00ff, // front bottom edge
			0x00ffff, // back bottom edge
			0xffccff, // left bottom edge
			0x000000, // right bottom edge
			0xff0000, // X/Y Edge (right,front)
			0x00ff00, // X/Y Edge (right,back)
			0x0000ff, // X/Y Edge (left,back)
			0xccefb0 // X/Y Edge (left,front)
		];

		// Position and add all 12 beveled edges
		const edgesPositionsRotations = [
			// Top horizontal edges
			{ pos: [0.5, 0.5, 0.5], rot: [0, -Math.PI / 2, 0] }, // Front top edge
			{ pos: [-0.5, 0.5, -0.5], rot: [0, Math.PI / 2, 0] }, // Back top edge
			{ pos: [-0.5, 0.5, -0.5], rot: [0, 0, Math.PI / 2] }, // Left top edge
			{ pos: [0.5, 0.5, -0.5], rot: [0, 0, 0] }, // Right top edge

			// Bottom horizontal edges
			{ pos: [0.5, -0.5, 0.5], rot: [0, -Math.PI / 2, -Math.PI / 2] }, // Front bottom edge
			{ pos: [-0.5, -0.5, -0.5], rot: [0, Math.PI / 2, -Math.PI / 2] }, // Back bottom edge
			{ pos: [-0.5, -0.5, -0.5], rot: [0, 0, Math.PI] }, // left bottom edge
			{ pos: [0.5, -0.5, -0.5], rot: [0, 0, -Math.PI / 2] }, // right bottom edge

			{ pos: [0.5, 0.5, 0.5], rot: [Math.PI / 2, 0, 0] }, // X/Y Edge (right,front)
			{ pos: [0.5, -0.5, -0.5], rot: [-Math.PI / 2, 0, 0] }, // X/Y Edge (right,back)
			{ pos: [-0.5, -0.5, -0.5], rot: [-Math.PI / 2, 0, Math.PI / 2] }, // X/Y Edge (left,back)
			{ pos: [-0.5, -0.5, 0.5], rot: [-Math.PI / 2, 0, Math.PI] } // Front top edge
		];

		this.orientationEdges = new THREE.Group();

		edgesPositionsRotations.forEach((edgeInfo, index) => {
			const edgeGeometry = new THREE.ExtrudeGeometry(edgeShape, extrudeSettings);
			const edgeMaterial = new THREE.MeshBasicMaterial({ color: grayColorList[7] });
			const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
			edge.position.set(...edgeInfo.pos).multiplyScalar(this.cubeSize);
			edge.scale.multiplyScalar(this.cubeSize);
			edge.rotation.set(...edgeInfo.rot);

			this.orientationEdges!.add(edge);

			// Add outline
			const edgeOutline = new THREE.EdgesGeometry(edgeGeometry);
			const edgeOutlineMesh = new THREE.LineSegments(
				edgeOutline,
				new THREE.LineBasicMaterial({ color: 0x000000 })
			);
			edgeOutlineMesh.position.copy(edge.position);
			edgeOutlineMesh.scale.copy(edge.scale);
			edgeOutlineMesh.rotation.copy(edge.rotation);
			this.orientationEdges!.add(edgeOutlineMesh);
		});

		this.scene.add(this.orientationEdges);

		// Draw tringles everywhere where two edges meet
		const triangleSideSize = Math.sqrt(Math.pow(bevelSize, 2) + Math.pow(bevelSize, 2));
		const points = [
			new Vector2(0, 0),
			new Vector2(0, triangleSideSize),
			new Vector2(triangleSideSize, 0)
		];

		const triangleShape = new THREE.Shape(points);
		const triangleGeo = new THREE.ShapeGeometry(triangleShape);

		const triangleMaterial = new THREE.MeshBasicMaterial({
			color: 0x0edfee,
			side: THREE.DoubleSide
		});
		const triangleMesh = new THREE.Mesh(triangleGeo, triangleMaterial);

		// triangleMesh.rotation.setFromVector3(new Vector3(0, Math.PI / 2, 0));

		// triangleMesh.position.set(0.5, 0.65, 0.5).multiplyScalar(cubeSize);
		// triangleMesh.scale.multiplyScalar(cubeSize);

		this.scene.add(triangleMesh);

		// const triangleMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
		// const trianglePositionsRotations = [
		// 	// Top horizontal edges
		// 	{ pos: [0.5, 0.5, 0.5], rot: [0, -Math.PI / 2, 0] }, // Front top edge
		// 	{ pos: [-0.5, 0.5, -0.5], rot: [0, Math.PI / 2, 0] }, // Back top edge
		// 	{ pos: [-0.5, 0.5, -0.5], rot: [0, 0, Math.PI / 2] }, // Left top edge
		// 	{ pos: [0.5, 0.5, -0.5], rot: [0, 0, 0] }, // Right top edge

		// 	// Bottom horizontal edges
		// 	{ pos: [0.5, -0.5, 0.5], rot: [0, -Math.PI / 2, -Math.PI / 2] }, // Front bottom edge
		// 	{ pos: [-0.5, -0.5, -0.5], rot: [0, Math.PI / 2, -Math.PI / 2] }, // Back bottom edge
		// 	{ pos: [-0.5, -0.5, -0.5], rot: [0, 0, Math.PI] }, // left bottom edge
		// 	{ pos: [0.5, -0.5, -0.5], rot: [0, 0, -Math.PI / 2] }, // right bottom edge

		// 	{ pos: [0.5, 0.5, 0.5], rot: [Math.PI / 2, 0, 0] }, // X/Y Edge (right,front)
		// 	{ pos: [0.5, -0.5, -0.5], rot: [-Math.PI / 2, 0, 0] }, // X/Y Edge (right,back)

		// const testGeo = this.createBoxWithRoundedEdges(1, 1, 1, 0.1, 1);

		// const cubeMaterial = new MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
		// this.orientationCube = new Mesh(cubeGeometry, materials);
		// const testMesh = new Mesh(testGeo, materials);
		// testMesh.scale.set(cubeSize, cubeSize, cubeSize);
		// this.scene.add(testMesh);

		// // Edges for the impression of beveled edge
		// const edges = new EdgesGeometry(testGeo);
		// const line = new LineSegments(edges, new LineBasicMaterial({ color: 0x000000 }));
		// line.scale.set(cubeSize, cubeSize, cubeSize);
		// this.scene.add(line);

		// const sidePositions = [
		// 	new Vector3(1, 0, 1),
		// 	new Vector3(-1, 0, 1),
		// 	new Vector3(-1, 0, -1),
		// 	new Vector3(1, 0, -1)
		// ];

		// const rotationAxis = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];

		// for (const axis of rotationAxis) {
		// 	const tube = new CylinderGeometry(0.5, 0.5, cubeSize, 10, 1, false);
		// 	for (const side of sidePositions) {
		// 		const tubeMesh = new Mesh(tube, new MeshBasicMaterial({ color: 0xff9933 }));
		// 		tubeMesh.rotation.setFromVector3(axis.clone().multiplyScalar(Math.PI / 2));
		// 		// Rotate side vector
		// 		const rotatedSide = side.clone().applyAxisAngle(axis, Math.PI / 2);
		// 		tubeMesh.position.copy(rotatedSide).multiplyScalar((cubeSize / 2) * 1.2);
		// 		// tubeMesh.position.copy(side).multiplyScalar(cubeSize / 2);
		// 		this.scene.add(tubeMesh);
		// 	}
		// }

		// // Draw pyramid on all corners
		// const pyramidGeo = new SphereGeometry(1.25);
		// for (const y of [1, -1]) {
		// 	for (const side of sidePositions) {
		// 		const pyramidMesh = new Mesh(pyramidGeo, new MeshBasicMaterial({ color: 0xffcc33 }));

		// 		pyramidMesh.position.copy(side);
		// 		pyramidMesh.position.y = y;
		// 		pyramidMesh.position.multiplyScalar((cubeSize / 2) * 1.2);

		// 		this.scene.add(pyramidMesh);
		// 	}
		// }

		// side lines
		// TODO: fixme render lines on top of cube

		// Add light to scene
		const light = new DirectionalLight(0xffffff, 1);
		light.position.set(0, 0, 1);

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

		console.log('Looking at', lookDirection, this.trackedCamera);

		const cameraPosition = lookDirection.multiplyScalar(300);
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
			const material = this.orientationCube!.material[this.previousFaceIndex];
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
		const material = this.orientationCube!.material[faceIndex];
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

		const edgeIntersections = this.raycaster.intersectObjects(this.orientationEdges!.children);

		if (edgeIntersections.length > 0) {
			edgeIntersections[0].object.material.color = new Color(0xff0000);
			return;
		}

		const intersects = this.raycaster.intersectObject(this.orientationCube!);
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
			this.scene.quaternion.copy(this.trackedCamera.quaternion).conjugate();
			this.scene.up.copy(this.trackedCamera.up);
			this.renderer.render(this.scene, this.camera);
		}
		requestAnimationFrame(this.startAnimationLoop.bind(this));
	}

	public setCurrentCamera(camera: THREE.Camera) {
		this.trackedCamera = camera;
	}
}
