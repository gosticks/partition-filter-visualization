import { PlaneRenderer } from '$lib/rendering/PlaneRenderer';
import { dataStore } from '$lib/store/dataStore/DataStore';
import { get } from 'svelte/store';
import {
	GraphOptions,
	type DataScaling,
	type Paths,
	setObjectValue,
	type PathValue,
	GraphType
} from '../types';

export type PlaneGraphState = {
	display: {
		// Y Axis display scaling
		yScale: number;
		axisRanges: Partial<{
			x: [number, number];
			y: [number, number];
			z: [number, number];
		}>;
	};
	data: {
		xTileCount: number;
		zTileCount: number;

		xColumnName: string;
		yColumnName: string;
		zColumnName: string;

		// Data scaling
		yScale: DataScaling;
		xScale: DataScaling;
		zScale: DataScaling;
	};
};

export class PlaneGraphOptions extends GraphOptions<Partial<PlaneGraphState>, PlaneRenderer> {
	private state: Partial<PlaneGraphState>;

	constructor(initialState: Partial<PlaneGraphState> = {}) {
		const data = get(dataStore);
		const numberTableColumns = Object.entries(data.combinedSchema)
			.filter(([, type]) => type === 'number')
			.map(([column]) => column);
		super(new PlaneRenderer(), {
			'data.xColumnName': {
				type: 'string',
				options: numberTableColumns,
				label: 'X Axis'
			},
			'data.zColumnName': {
				type: 'string',
				options: numberTableColumns,
				label: 'Z Axis'
			},
			'data.yColumnName': {
				type: 'string',
				options: numberTableColumns,
				label: 'Y Axis'
			},
			'data.xTileCount': {
				type: 'number',
				options: [1, 2, 4, 8, 16, 32, 64],
				label: 'X Tile Count'
			},
			'data.zTileCount': {
				type: 'number',
				options: [1, 2, 4, 8, 16, 32, 64],
				label: 'Z Tile Count'
			}
		});

		this.state = initialState;
		console.log('Created plane graph options', this.state);
		this.applyOptionsIfValid();
	}

	public getType(): GraphType {
		return GraphType.PLANE;
	}

	public getRenderer(): PlaneRenderer {
		return this.renderer as PlaneRenderer;
	}

	public getCurrentOptions() {
		return this.state;
	}
	public isValid(): boolean {
		const requiredDisplayFields: (keyof PlaneGraphState['display'])[] = [];

		const requiredDataFields: (keyof PlaneGraphState['data'])[] = [
			'xTileCount',
			'zTileCount',
			'xColumnName',
			'yColumnName',
			'zColumnName'
		];

		const displayValid = requiredDisplayFields.every(
			(field) => this.state.display?.[field] !== undefined
		);

		const dataValid = requiredDataFields.every((field) => this.state.data?.[field] !== undefined);

		return displayValid && dataValid;
	}

	public setStateValue<P extends Paths<Partial<PlaneGraphState>>>(
		path: P,
		value: PathValue<Partial<PlaneGraphState>, P>
	) {
		(setObjectValue as any)(this.state, path, value as unknown);
	}

	public async applyOptionsIfValid() {
		const isValid = this.isValid();
		if (!isValid) {
			return;
		}

		// Query data required for this graph
		const { xColumnName, yColumnName, zColumnName, xTileCount, zTileCount } = this.state.data!;

		// Get all layers
		try {
			const options = await dataStore.getDistinctValues('bloom', 'mode');

			const promise = await Promise.all(
				options.map((mode) =>
					dataStore.getTiledData('bloom', mode as string, {
						xColumnName,
						yColumnName,
						zColumnName,
						xTileCount,
						zTileCount
					})
				)
			);
			const layers = promise.map((data, index) => ({
				points: data,
				name: options[index] as string,
				meta: {}
			}));
			this.renderer.updateWithData({
				layers,
				labels: {
					x: xColumnName,
					y: yColumnName,
					z: zColumnName
				},

				scaleY: 10
			});
		} catch (e) {
			console.error('Failed to load tiled data:', e);
			return;
		}
	}
}
