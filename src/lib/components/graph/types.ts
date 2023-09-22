import * as THREE from 'three';

export type GraphUnsubscribe = () => void;

export type GraphRenderLoopCallback = (
	renderer: THREE.WebGLRenderer,
	scene: THREE.Scene,
	camera: THREE.Camera
) => void;

// let displatFilter: ;
export type GraphService = {
	getValues: () => {
		scene: THREE.Scene;
		camera: THREE.Camera;
		renderer: THREE.WebGLRenderer;
		domElement: HTMLElement;
	};
	registerOnBeforeRender: (callback: GraphRenderLoopCallback) => GraphUnsubscribe;
	registerOnAfterRender: (callback: GraphRenderLoopCallback) => GraphUnsubscribe;
};
