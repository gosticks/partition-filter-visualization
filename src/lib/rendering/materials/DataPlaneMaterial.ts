import * as THREE from 'three';

// Define your colors
const color1 = new THREE.Color('#F0F624');
const color2 = new THREE.Color('#C5407D');
const color3 = new THREE.Color('#15078A');

export class DataPlaneShapeMaterial extends THREE.ShaderMaterial {
	static vertexShader = `
	varying float y;
	varying vec3 vNormal;
	varying vec3 vViewPosition;

	#if NUM_DIR_LIGHTS > 0

    struct DirectionalLight {
        vec3 direction;
        vec3 color;
    };

    uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];

    void applyDirectionalLight(int index, vec3 normal, vec3 viewDir) {
        DirectionalLight light = directionalLights[ index ];
        // ... apply lighting based on light direction and color
    }

#endif
	void main() {
		y = position.y;
		vNormal = normalize( normalMatrix * normal );
		vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
		vViewPosition = -mvPosition.xyz;
		gl_Position = projectionMatrix * mvPosition;
	}
		`;

	// Define the fragment shader that uses the y-coordinate to color
	static fragmentShader = `
	uniform float opacity;
	uniform vec3 colorA;
	uniform vec3 colorB;
	uniform vec3 lightPosition;

	varying vec3 vNormal;
	varying float y;
	varying vec3 vViewPosition;

	void main() {
		// Use the y-coordinate to determine the color
		vec3 color = mix(colorA, colorB, y);

		// ambient
		float ambientStrength = 0.90;
		vec3 ambient = ambientStrength * color;

		// diffuse
		vec3 norm = normalize(vNormal);
		vec3 lightDir = normalize(lightPosition - vViewPosition);
		float diff = max(dot(norm, lightDir), 0.0);
		vec3 diffuse = diff * color;

		// specular
		float specularStrength = 0.25;
		vec3 viewDir = normalize(-vViewPosition);
		vec3 reflectDir = reflect(-lightDir, norm);
		float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
		vec3 specular = specularStrength * spec * color;

		vec3 result = (ambient + diffuse + specular);
		gl_FragColor = vec4(result, opacity);
	}`;

	setOpacity(value: number) {
		this.opacity = value;
		this.uniforms.opacity.value = value;
	}

	constructor(
		colorA: THREE.Color = color2,
		colorB: THREE.Color = color3,
		options: Omit<THREE.ShaderMaterialParameters, 'lights'> = {}
	) {
		super({
			...options,
			vertexShader: DataPlaneShapeMaterial.vertexShader,
			fragmentShader: DataPlaneShapeMaterial.fragmentShader,
			// lights: true,
			// wireframe: true,
			side: THREE.DoubleSide,
			uniforms: THREE.UniformsUtils.merge([
				THREE.UniformsLib['common'],
				THREE.UniformsLib['lights'],

				{
					colorA: { value: colorA },
					colorB: { value: colorB },
					opacity: { value: options.opacity ?? 1 }
				}
			])
		});
		// super.onBeforeCompile = function (shader) {
		// 	// Add custom uniforms if needed
		// 	shader.uniforms.customColor1 = { value: new THREE.Color(0xff0000) }; // Red
		// 	shader.uniforms.customColor2 = { value: new THREE.Color(0x0000ff) }; // Blue

		// 	// Replace gl_FragColor with your own color logic
		// 	shader.fragmentShader = shader.fragmentShader.replace(
		// 		'gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
		// 		[
		// 			'float gradientFactor = (normal.y + 1.0) / 2.0;', // Make it range from 0 to 1
		// 			'vec3 gradientColor = mix(customColor1, customColor2, gradientFactor);',
		// 			'gl_FragColor = vec4( gradientColor, diffuseColor.a );'
		// 		].join('\n')
		// 	);

		// 	console.log(shader.fragmentShader);
		// };
	}
}
