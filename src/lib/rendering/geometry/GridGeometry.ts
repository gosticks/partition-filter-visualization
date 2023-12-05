import {Color, BufferGeometry, LineBasicMaterial, LineSegments, Float32BufferAttribute } from "three";


class EnhancedGridHelper extends LineSegments<BufferGeometry, LineBasicMaterial> {

	constructor( size = 10, divisionsX = 10, divisionsZ = 30, color1 = 0x444444, color2 = 0x888888 ) {

		const c1 = new Color( color1 );
		const c2 = new Color( color2 );
		const halfSize = size / 2;

		const centerX = divisionsX / 2;
		const stepX = size / divisionsX;


		const centerZ = divisionsZ / 2;
		const stepZ = size / divisionsZ;

		const verticesX = [], colorsX:number[] = [];
		const verticesZ = [], colorsZ:number[] = [];

		for ( let i = 0, j = 0, k = - halfSize; i <= divisionsX; i ++, k += stepX ) {
			verticesX.push( - halfSize, 0, k, halfSize, 0, k);
			const color = i === centerX ? c1 : c2;

			color.toArray( colorsX, j ); j += 3;
			color.toArray( colorsX, j ); j += 3;
		}

		for ( let i = 0, j = 0, k = - halfSize; i <= divisionsZ; i ++, k += stepZ ) {
			verticesZ.push( k, 0, - halfSize, k, 0, halfSize );
			const color = i === centerZ ? c1 : c2;

			color.toArray( colorsZ, j ); j += 3;
			color.toArray( colorsZ, j ); j += 3;
		}

		const vertices = [...verticesX, ...verticesZ]
		const colors = [...colorsX, ...colorsZ]
		const geometry = new BufferGeometry();
		geometry.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
		geometry.setAttribute( 'color', new Float32BufferAttribute( colors, 3 ) );
		const material = new LineBasicMaterial( { vertexColors: true, toneMapped: false } );
		super( geometry, material );


	}

	dispose() {

		this.geometry.dispose();
		this.material.dispose();

	}

}

export default EnhancedGridHelper;