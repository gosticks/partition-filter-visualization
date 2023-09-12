import { PlaneRenderer } from '$lib/rendering/PlaneRenderer';
import { dataStore } from '$lib/store/dataStore/DataStore';
import { get } from 'svelte/store';
import { GraphOptions, type Paths, setObjectValue, type PathValue, GraphType } from '../types';
import { DataScaling } from '$lib/store/dataStore/types';
import FilterStore from '../FilterStore';
import { graphColors, graphColors2 } from '$lib/rendering/colors';

export type PlaneGraphState = {
	// Y Axis display scaling
	axisRanges: Partial<{
		x: [number, number];
		y: [number, number];
		z: [number, number];
	}>;
	xTileCount: number;
	zTileCount: number;

	xColumnName: string;
	yColumnName: string;
	zColumnName: string;

	// Data scaling
	yScale: DataScaling;
	xScale: DataScaling;
	zScale: DataScaling;

	normalized: string;
};

export class PlaneGraphOptions extends GraphOptions<Partial<PlaneGraphState>, PlaneRenderer> {
	private state: Partial<PlaneGraphState>;

	constructor(initialState: Partial<PlaneGraphState> = {}) {
		super(new PlaneRenderer(), {});
		this.updateFilterOptions();

		this.state = initialState;
		console.log('Created plane graph options', this.state);
		this.applyOptionsIfValid();
	}

	public updateFilterOptions() {
		const data = get(dataStore);
		const numberTableColumns = Object.entries(data.combinedSchema)
			.filter(([, type]) => type === 'number')
			.map(([column]) => column);
		this.filterOptions = {
			xColumnName: {
				type: 'string',
				options: numberTableColumns,
				label: 'X Axis'
			},
			zColumnName: {
				type: 'string',
				options: numberTableColumns,
				label: 'Z Axis'
			},
			yColumnName: {
				type: 'string',
				options: numberTableColumns,
				label: 'Y Axis'
			},
			xTileCount: {
				type: 'number',
				options: [1, 2, 4, 8, 16, 32, 64],
				label: 'X Tile Count'
			},
			zTileCount: {
				type: 'number',
				options: [1, 2, 4, 8, 16, 32, 64],
				label: 'Z Tile Count'
			},
			yScale: {
				type: 'string',
				options: [DataScaling.LINEAR, DataScaling.LOG],
				label: 'Y Scale'
			},
			normalized: {
				type: 'string',
				label: 'Normalized',
				options: ['true', 'false']
			}
		};
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
		const requiredFields: (keyof PlaneGraphState)[] = [
			'xTileCount',
			'zTileCount',
			'xColumnName',
			'yColumnName',
			'zColumnName'
		];

		return requiredFields.every((field) => this.state[field] !== undefined);
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
			console.error('Invalid graph options', this.state);
			return;
		}

		// Query data required for this graph
		const { xColumnName, yColumnName, zColumnName, xTileCount, zTileCount, yScale } = this
			.state as PlaneGraphState;

		console.log('Querying tiled data for plane graph', this.state);

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
						zTileCount,
						scale: yScale
					})
				)
			);
			const layers = promise.map((data, index) => ({
				points: data.data,
				min: data.min,
				max: data.max,
				name: options[index] as string,
				color: graphColors[index % graphColors.length],
				meta: {
					rows: data.queryResult
				}
			}));

			this.renderer.updateWithData({
				layers,
				labels: {
					x: xColumnName,
					y: yColumnName,
					z: zColumnName
				},
				normalized: this.state.normalized === 'true',
				scaleY: 10
			});

			// FIXME: restructure this somewhere else
			this.renderer.onDataPointSelected = (point, meta) => {
				FilterStore.update((store) => {
					if (!point) {
						store.selectedPoint = undefined;
						return store;
					}
					store.selectedPoint = {
						dataPosition: point,
						instanceId: 0,
						meta: meta
					};
					return store;
				});
			};
		} catch (e) {
			console.error('Failed to load tiled data:', e);
			return;
		}
	}
}
