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
import { TextTexture } from './textures/TextTexture';
import type { ThemeColors } from '$lib/store/SettingsStore';

enum SelectionType {
	side,
	edge,
	corner
}
export class Minimap {
	private scene!: Scene;
	private orientationCube?: THREE.Group;
	private orientationEdges?: THREE.Group;
	private renderer: THREE.WebGLRenderer;
	private camera: THREE.Camera;
	private trackedCamera: THREE.Camera | undefined = undefined;

	private raycaster = new Raycaster();
	private stopped = false;

	private cubeSize = 20;
	private bevelSize = 0.1;

	// private _selectionColor = new Color(0xffffee);
	// private _color = new Color(0xff00ff);
	// private _labelColor = new Color(0xff00ff);
	// private _borderColor = new Color(0xff00ff);

	// public set color(color: THREE.ColorRepresentation) {
	// 	this._color = new THREE.Color(color);
	// 	this.update();
	// }
	// public set labelColor(labelColor: THREE.ColorRepresentation) {
	// 	this._labelColor = new THREE.Color(labelColor);
	// 	this.update();
	// }

	// public set borderColor(borderColor: THREE.ColorRepresentation) {
	// 	this._borderColor = new THREE.Color(borderColor);
	// 	this.update();
	// }

	public set updateColors(themeColors: ThemeColors) {
		this.themeColors = themeColors;
		this.update();
	}

	private mousePosition: THREE.Vector2 = new Vector2(0, 0);
	private mouseClientPosition: THREE.Vector2 = new Vector2(0, 0);
	private mouseInside = false;
	private mouseDownPos = { x: 0, y: 0 };
	private mouseUpPos = { x: 0, y: 0 };

	private sideNames = ['Z+', 'Z-', 'Y+', 'Y-', 'X+', 'X-'];
	private controls!: OrbitControls;

	private selection?: {
		type: SelectionType;
		index: number;
	};

	private get selectedMesh(): Mesh<THREE.PlaneGeometry, MeshBasicMaterial> | null {
		if (!this.selection) {
			return null;
		}
		return (
			(this.orientationCube?.children.at(this.selection.index) as Mesh<
				THREE.PlaneGeometry,
				MeshBasicMaterial
			>) ?? null
		);
	}

	constructor(
		element: HTMLElement,
		private themeColors: ThemeColors
	) {
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
		this.update();

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

	public update() {
		this.renderCube();
		this.renderCubeEdges();
	}

	public setCameraState(state: CameraState) {
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

	private setupControls() {
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
	}

	private renderCube() {
		// let sideNames = ['Z+', 'Z-', 'Y+', 'Y-', 'X+', 'X-'];

		const offset = 0.5 + this.bevelSize;
		const planeDefinitions = [
			[new Vector3(0, 0, offset), new Vector3(0, 0, 0), this.sideNames[0]],
			[new Vector3(0, 0, -offset), new Vector3(0, Math.PI, 0), this.sideNames[1]],
			[new Vector3(0, offset, 0), new Vector3(-Math.PI / 2, 0, 0), this.sideNames[2]],
			[new Vector3(0, -offset, 0), new Vector3(Math.PI / 2, 0, 0), this.sideNames[3]],
			[new Vector3(offset, 0, 0), new Vector3(0, -Math.PI / 2, 0), this.sideNames[4]],
			[new Vector3(-offset, 0, 0), new Vector3(0, Math.PI / 2, 0), this.sideNames[5]]
		] as [Vector3, Vector3, string][];
		this.orientationCube?.clear();
		this.orientationCube?.removeFromParent();
		this.orientationCube = new THREE.Group();

		const color = new THREE.Color(this.themeColors.surfaceColor);
		const labelColor = new THREE.Color(this.themeColors.textSecondaryColor);

		planeDefinitions.forEach(([position, orientation, label]) => {
			const plane = new THREE.PlaneGeometry(1, 1);
			const mesh = new Mesh(
				plane,
				new THREE.MeshBasicMaterial({
					side: THREE.DoubleSide,
					transparent: true,
					map: new TextTexture(label, {
						color: labelColor.getStyle(),
						font: 'monospace',
						width: 128,
						height: 128,
						fontSize: 50,
						backgroundColor: color.getStyle()
					})
				})
			);
			mesh.userData = {
				label: label
			};
			mesh.rotation.set(orientation.x, orientation.y, orientation.x);
			mesh.position.set(position.x, position.y, position.z);
			this.orientationCube?.add(mesh);
		});

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
		const color = new THREE.Color(this.themeColors.surfaceSecondaryColor);
		const borderColor = new THREE.Color(this.themeColors.border);
		const labelColor = new THREE.Color(this.themeColors.textSecondaryColor);

		edgesPositionsRotations.forEach((edgeInfo, index) => {
			const edgeGeometry = new THREE.ExtrudeGeometry(edgeShape, extrudeSettings);
			const edgeMaterial = new THREE.MeshBasicMaterial({
				// color: this._color,
				map: new TextTexture('', {
					color: labelColor.getStyle(),
					width: 1,
					height: 1,
					fontSize: 1,
					backgroundColor: color.getStyle()
				})
			});
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
				new THREE.LineBasicMaterial({ color: borderColor })
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

	//
	// Animation loop setup
	//

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

	//
	// Selection handling
	//

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
		const faceName = intersects[0].object.userData['label'];
		if (faceName === undefined) {
			return false;
		}

		const cubeFaceIndex = this.sideNames.indexOf(faceName);
		if (cubeFaceIndex === -1) {
			return false;
		}

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
		this.applyColorToSelectedObject(new THREE.Color());
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
				const material = this.selectedMesh?.material;
				if (material) {
					material.color = color;
					material.needsUpdate = true;
				}

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
		const color = new THREE.Color(this.themeColors.selectionColor);
		this.applyColorToSelectedObject(color);
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

	private lookAtFaceDirection(cubeFaceIndex: number): THREE.Vector3 | null {
		// console.log('looking at side', cubeFaceIndex);
		let lookDirection: THREE.Vector3 | null = null;
		switch (cubeFaceIndex) {
			case 0:
				lookDirection = new Vector3(0, 0, 1);
				break;
			case 1:
				lookDirection = new Vector3(0, 0, -1);
				break;
			case 2:
				lookDirection = new Vector3(0, 1, 0);
				break;
			case 3:
				lookDirection = new Vector3(0, -1, 0);
				break;
			case 4:
				lookDirection = new Vector3(1, 0, 0);
				break;
			case 5:
				lookDirection = new Vector3(-1, 0, 0);
				break;
		}

		return lookDirection;
	}

	private lookAtEdgeDirection(edgeIndex: number) {
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
				return new Vector3(-1, -1, 0);
			case 7:
				return new Vector3(1, -1, 0);
			case 8:
				return new Vector3(1, 0, 1);
			case 9:
				return new Vector3(1, 0, -1);
			case 10:
				return new Vector3(-1, 0, -1);
			case 11:
				return new Vector3(-1, 0, 1);
		}

		return null;
	}

	private lookAtSelection() {
		if (!this.selection) {
			return;
		}
		const initialDirection = new Vector3(0, 0, 0); // Default camera looking direction
		initialDirection.applyQuaternion(this.camera.quaternion);

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
		const initialPosition = this.camera.position.clone();
		const cameraTargetPosition = lookDirection.multiplyScalar(300);
		// const cameraTargetOrientation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.5, 0));
		// const initialOrientation = this.camera.quaternion.clone();

		// Compute distance between current camera position and target to compute animation duration
		const distance = initialPosition.distanceTo(cameraTargetPosition);
		const duration = Math.min(Math.max(100, distance * 2), 200);

		// Animate camera
		new Tween(initialPosition)
			.to(cameraTargetPosition, duration)
			.easing(Easing.Cubic.In)
			.onUpdate((value) => {
				this.camera.position.set(value.x, value.y, value.z);
			})
			.start();
		// new Tween(initialOrientation)
		// 	.to(cameraTargetOrientation, duration)
		// 	.easing(Easing.Cubic.In)
		// 	.onUpdate((value) => {
		// 		this.camera.quaternion.copy(value);
		// 	})
		// 	.start();
	}
}
