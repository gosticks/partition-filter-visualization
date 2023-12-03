import {
	BoxGeometry,
	Mesh,
	MeshBasicMaterial,
	OrthographicCamera,
	Raycaster,
	Scene,
	Vector2,
	WebGLRenderer,
	Color,
	Vector3,
	DirectionalLight
} from 'three';
import { AxisRenderer } from './AxisRenderer';
import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Easing, Tween } from '@tweenjs/tween.js';
import { colorBrewer } from './colors';
import type { CameraState } from '$lib/components/BasicGraph.svelte';

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

enum SelectionType {
	side,
	edge,
	corner
}
export class Minimap {
	private scene!: Scene;
	private orientationCube?: Mesh<BoxGeometry, MeshBasicMaterial[]>;
	private orientationEdges?: THREE.Group;
	private renderer: THREE.WebGLRenderer;
	private camera: THREE.Camera;
	private trackedCamera: THREE.Camera | undefined = undefined;

	private raycaster = new Raycaster();
	private stopped = false;

	private cubeSize = 20;
	private bevelSize = 0.1;

	public selectionColor = new Color(colorBrewer.RdYlBu[4][1]);
	public color = new Color(grayColorList[9]);
	public borderColor = new Color(grayColorList[3]);

	private mousePosition: THREE.Vector2 = new Vector2(0, 0);
	private mouseClientPosition: THREE.Vector2 = new Vector2(0, 0);
	private mouseInside = false;
	private mouseDownPos = { x: 0, y: 0 };
	private mouseUpPos = { x: 0, y: 0 };
	private controls!: OrbitControls;

	private selection?: {
		type: SelectionType;
		index: number;
	};

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

		this.setupEvents(element);
		this.setupScene();
		this.renderCube();
		this.renderCubeEdges();

		// Setup renderer
		this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setClearColor(0x000000, 0);
		this.renderer.setSize(bounds.width, bounds.height);
		element.appendChild(this.renderer.domElement);

		this.setupControls();

		this.startAnimationLoop();
	}

	destroy() {
		this.stopped = true;
	}

	public setCameraState(state:CameraState) {
		this.camera.position.copy(state.position);
		this.camera.rotation.copy(state.rotation);
		this.controls.update();
	}

	private onCanvasHover(event: MouseEvent) {
		// Normalize mouse position
		const bounds = this.renderer.domElement.getBoundingClientRect();
		this.mouseClientPosition.x = event.clientX - bounds.left;
		this.mouseClientPosition.y = event.clientY - bounds.top;

		this.mousePosition.x = (this.mouseClientPosition.x / bounds.width) * 2 - 1;
		this.mousePosition.y = -(this.mouseClientPosition.y / bounds.height) * 2 + 1.0;
	}

	private onCanvasClick(event: MouseEvent) {
		this.lookAtSelection();
	}

	setupControls() {
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.rotateSpeed = 1;
		this.controls.zoomSpeed = 1;
		this.controls.panSpeed = 1;
		this.controls.enableZoom = false;
		this.controls.enablePan = false;
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.1;
	}

	private setupEvents(element: HTMLElement) {
		// Setup event listeners
		element.addEventListener('mousemove', this.onCanvasHover.bind(this));

		element.addEventListener('mousedown', (event) => {
			this.mouseDownPos.x = event.clientX;
			this.mouseDownPos.y = event.clientY;
		});

		element.addEventListener('mouseup', (event) => {
			this.mouseUpPos.x = event.clientX;
			this.mouseUpPos.y = event.clientY;

			// Check if positions match to detect if it was just a click
			if (this.mouseDownPos.x === this.mouseUpPos.x && this.mouseDownPos.y === this.mouseUpPos.y) {
				this.onCanvasClick(event);
			}
		});

		element.addEventListener('mouseenter', () => {
			this.mouseInside = true;
		});

		element.addEventListener('mouseleave', () => {
			this.mouseInside = false;
		});
	}

	private setupScene() {
		this.scene = new Scene();

		// side lines
		// TODO: fixme render lines on top of cube

		// Add light to scene
		// const light = new DirectionalLight(0xffffff, 1);
		// light.position.set(0, 0, 1);
	}

	private renderCube() {
		const cubeGeometry = new BoxGeometry(1, 1, 1);

		const materials = [
			new MeshBasicMaterial({ color: this.color }),
			new MeshBasicMaterial({ color: this.color }),
			new MeshBasicMaterial({ color: this.color }),
			new MeshBasicMaterial({ color: this.color }),
			new MeshBasicMaterial({ color: this.color }),
			new MeshBasicMaterial({ color: this.color })
		];
		this.orientationCube = new Mesh(cubeGeometry, materials);
		this.orientationCube.scale.set(this.cubeSize, this.cubeSize, this.cubeSize);
		this.scene.add(this.orientationCube);
	}

	private renderCubeEdges() {
		// Create beveled edge for one edge (as an example)
		const edgeShape = new THREE.Shape();
		edgeShape.moveTo(0, 0);
		edgeShape.lineTo(this.bevelSize, 0);
		edgeShape.lineTo(0.0, this.bevelSize);
		edgeShape.lineTo(0, 0);

		const extrudeSettings = {
			steps: 1,
			depth: 1,
			bevelEnabled: false
		};

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

		const orientationEdges = new THREE.Group();

		edgesPositionsRotations.forEach((edgeInfo, index) => {
			const edgeGeometry = new THREE.ExtrudeGeometry(edgeShape, extrudeSettings);
			const edgeMaterial = new THREE.MeshBasicMaterial({ color: this.color });
			const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);

			edge.position.set(...edgeInfo.pos).multiplyScalar(this.cubeSize);
			edge.scale.multiplyScalar(this.cubeSize);
			edge.rotation.set(...edgeInfo.rot);

			edge.userData.index = index;
			orientationEdges.add(edge);

			// Add outline
			const edgeOutline = new THREE.EdgesGeometry(edgeGeometry);
			const edgeOutlineMesh = new THREE.LineSegments(
				edgeOutline,
				new THREE.LineBasicMaterial({ color: this.borderColor })
			);
			edgeOutlineMesh.position.copy(edge.position);
			edgeOutlineMesh.scale.copy(edge.scale);
			edgeOutlineMesh.rotation.copy(edge.rotation);

			// pass index to mesh for later selection handling

			orientationEdges.add(edgeOutlineMesh);
		});

		this.orientationEdges = orientationEdges;
		this.scene.add(this.orientationEdges);

		// Setup corner triangles
		// // FIXME: not correct positions yet
		// const triangleSideSize = Math.sqrt(Math.pow(bevelSize, 2) + Math.pow(bevelSize, 2));
		// const points = [
		// 	new Vector2(0, 0),
		// 	new Vector2(0, triangleSideSize),
		// 	new Vector2(triangleSideSize, 0)
		// ];

		// const triangleShape = new THREE.Shape(points);
		// const triangleGeo = new THREE.ShapeGeometry(triangleShape);

		// const triangleMaterial = new THREE.MeshBasicMaterial({
		// 	color: 0x0edfee,
		// 	side: THREE.DoubleSide
		// });
		// const triangleMesh = new THREE.Mesh(triangleGeo, triangleMaterial);

		// this.scene.add(triangleMesh);
	}
	private lookAtFaceDirection(cubeFaceIndex: number): THREE.Vector3 | null {
		console.log('looking at side', cubeFaceIndex);
		let lookDirection: THREE.Vector3 | null = null;
		switch (cubeFaceIndex) {
			case 0:
				lookDirection = new Vector3(1, 0, 0);
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

		return lookDirection;
	}

	private lookAtEdgeDirection(edgeIndex: number) {
		console.log('looking at edge', edgeIndex);
		switch (edgeIndex) {
			case 0:
				return new Vector3(0, 1, 1);
			case 1:
				return new Vector3(0, 1, -1);
			case 2:
				return new Vector3(-1, 1, 0);
			case 3:
				return new Vector3(1, 1, 0);
			case 4:
				return new Vector3(0, -1, 1);
			case 5:
				return new Vector3(0, -1, -1);
			case 6:
				return new Vector3(-1, -1);
			case 7:
				return new Vector3(1, -1);
		}

		return null;
	}

	private lookAtSelection() {
		if (!this.selection) {
			return;
		}

		let lookDirection: Vector3 | null = null;

		switch (this.selection.type) {
			case SelectionType.side:
				lookDirection = this.lookAtFaceDirection(this.selection.index);
				break;
			case SelectionType.edge:
				lookDirection = this.lookAtEdgeDirection(this.selection.index);
				break;
			case SelectionType.corner:
				// FIXME: implement corner selection
				console.error('Not implemented');
		}

		if (lookDirection === null) {
			return;
		}
		const initialLookAt = this.camera.position.clone();
		const cameraTarget = lookDirection.multiplyScalar(300);

		// Compute distance between current camera position and target to compute animation duration
		const distance = initialLookAt.distanceTo(cameraTarget);
		const duration = Math.min(200, distance * 2);

		// Animate camera
		new Tween(initialLookAt)
			.to(cameraTarget, duration) // 2000 milliseconds
			.easing(Easing.Cubic.In) // Easing type
			.onUpdate(() => {
				this.camera.position.set(initialLookAt.x, initialLookAt.y, initialLookAt.z);
				// Called during the update of the tween. Useful if you need to perform actions during the animation.
			})
			.start();
	}

	private handleEdgeSelection(): boolean {
		if (!this.orientationEdges) {
			return false;
		}
		const intersections = this.raycaster.intersectObjects(this.orientationEdges.children);
		if (intersections.length === 0) {
			return false;
		}

		const object = intersections.find((el) => el.object.userData.index !== undefined)
			?.object as THREE.Mesh;
		if (!object) {
			return false;
		}

		const index = object.userData.index;

		// if selection did not change
		// return selection handled but do nothing else to prevent further search
		if (
			this.selection &&
			this.selection.type === SelectionType.side &&
			index === this.selection.index
		) {
			return true;
		}

		this.clearSelection();

		// If we selected some other geometry ignore hit test
		if (index === undefined) {
			return false;
		}

		// Update selection
		this.selection = {
			type: SelectionType.edge,
			index: index
		};

		return true;
	}

	private handleSideSelection(): boolean {
		if (!this.orientationEdges || !this.orientationCube) {
			return false;
		}

		const intersects = this.raycaster.intersectObject(this.orientationCube);
		if (intersects.length === 0) {
			return false;
		}

		const faceIndex = intersects[0].faceIndex;
		if (faceIndex === undefined) {
			return false;
		}

		const cubeFaceIndex = Math.floor(faceIndex / 2);

		// If selection matches current element do nothing just mark event as handled
		if (
			this.selection &&
			this.selection.type === SelectionType.side &&
			this.selection.index === cubeFaceIndex
		) {
			return true;
		}

		this.clearSelection();

		this.selection = {
			type: SelectionType.side,
			index: cubeFaceIndex
		};

		return true;
	}

	private clearSelection() {
		this.applyColorToSelectedObject(this.color);
		this.selection = undefined;
	}

	private applyColorToSelectedObject(color: THREE.Color) {
		if (!this.selection) {
			return;
		}

		// Find matching element and restore original material
		switch (this.selection.type) {
			case SelectionType.side: {
				if (!this.orientationCube) {
					break;
				}
				const material = this.orientationCube.material[this.selection.index];
				material.color = color;
				material.needsUpdate = true;

				break;
			}
			case SelectionType.edge: {
				if (!this.orientationEdges) {
					break;
				}

				const mesh = this.orientationEdges.children.find(
					(el) => el.userData.index === this.selection?.index
				) as Mesh<THREE.ExtrudeGeometry, MeshBasicMaterial> | undefined;
				if (!mesh) {
					break;
				}

				mesh.material.color = color;
				mesh.material.needsUpdate = true;

				break;
			}
			case SelectionType.corner: {
				console.error('Not implemented yet');
				break;
			}
		}
	}

	private renderSelection() {
		this.applyColorToSelectedObject(this.selectionColor);
	}

	private updateSelection() {
		if (!this.mouseInside) {
			this.clearSelection();
			return;
		}

		if (this.handleEdgeSelection()) {
			this.renderSelection();
			return;
		}

		if (this.handleSideSelection()) {
			this.renderSelection();
			return;
		}

		this.clearSelection();
	}

	private startAnimationLoop() {
		if (this.stopped) {
			return;
		}

		if (this.trackedCamera) {
			this.controls.update();

			// Update raycaster but only if mouse moved
			this.raycaster.setFromCamera(this.mousePosition, this.camera);

			this.updateSelection();
			this.renderer.render(this.scene, this.camera);

			// Set target camera to match the one we're tracking
			this.trackedCamera.position.copy(this.camera.position);
			this.trackedCamera.quaternion.copy(this.camera.quaternion);
		}

		requestAnimationFrame(this.startAnimationLoop.bind(this));
	}

	public setCurrentCamera(camera: THREE.Camera) {
		this.trackedCamera = camera;
	}
}
