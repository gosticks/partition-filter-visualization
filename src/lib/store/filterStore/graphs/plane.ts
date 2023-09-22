import type { IPlaneRendererData } from '$lib/rendering/PlaneRenderer';
import { dataStore } from '$lib/store/dataStore/DataStore';
import { get, readonly, writable, type Readable, type Writable } from 'svelte/store';
import { GraphOptions, GraphType } from '../types';
import { DataScaling } from '$lib/store/dataStore/types';
import { graphColors } from '$lib/rendering/colors';
import type { ITiledDataOptions, ValueRange } from '$lib/store/dataStore/filterActions';
import { urlDecodeObject, urlEncodeObject, withSingleKeyUrlStorage } from '$lib/store/urlStorage';
import { withLogMiddleware } from '$lib/store/logMiddleware';
import notificationStore from '$lib/store/notificationStore';

type RequiredOptions = ITiledDataOptions & {
	groupBy: string;
};

export type IPlaneGraphState = (
	| ({
			isValid: true;
	  } & RequiredOptions)
	| ({
			isValid: false;
	  } & Partial<RequiredOptions>)
) & { isRendered: boolean };

export class PlaneGraphOptions extends GraphOptions<
	Partial<RequiredOptions>,
	IPlaneRendererData | undefined
> {
	private _dataStore: Writable<IPlaneRendererData | undefined>;
	private _optionsStore: Writable<IPlaneGraphState>;

	public dataStore: Readable<IPlaneRendererData | undefined>;
	public optionsStore: Readable<Partial<RequiredOptions>>;

	constructor(initialState: Partial<RequiredOptions> = {}) {
		super({});

		this._dataStore = writable(undefined);
		this.dataStore = readonly(this._dataStore);

		// Check if options are initially valid
		const initialOptions = {
			isRendered: false,
			isValid: this.isValid(initialState),
			...initialState
		} as IPlaneGraphState;

		this._optionsStore = withLogMiddleware(
			withSingleKeyUrlStorage(
				writable(initialOptions),
				'filterStore',
				(state) => {
					return urlEncodeObject(state);
				},
				(value) => {
					if (!value || value === 'undefined') {
						return initialOptions;
					}
					const state = urlDecodeObject(value);
					return {
						isRendered: false,
						isValid: this.isValid(state),
						...state
					} as IPlaneGraphState;
				}
			),
			'PlaneGraphOptions',
			{
				color: 'orange'
			}
		);
		this.optionsStore = readonly(this._optionsStore);

		this.reloadFilterOptions();

		this.applyOptionsIfValid();
	}

	public setFilterOption = <K extends keyof RequiredOptions>(key: K, value: RequiredOptions[K]) => {
		this._optionsStore.update((store) => {
			(store as Partial<RequiredOptions>)[key] = value;
			store.isValid = this.isValid(store);
			return store;
		});

		this.applyOptionsIfValid();
	};

	public toString(): string {
		const state = get(this._optionsStore);
		console.log('Encoding', state);
		return urlEncodeObject({
			type: this.getType(),
			state
		});
	}

	private isValid(state: Partial<RequiredOptions> | undefined): boolean {
		if (!state) {
			return false;
		}
		const { xColumnName, yColumnName, zColumnName, tileCount, groupBy } = state;
		return (
			typeof groupBy === 'string' &&
			typeof xColumnName === 'string' &&
			typeof yColumnName === 'string' &&
			typeof zColumnName === 'string' &&
			typeof tileCount === 'number'
		);
	}

	public reloadFilterOptions() {
		const data = get(dataStore);
		const stringTableColumns = Object.entries(data.combinedSchema)
			.filter(([, type]) => type === 'string')
			.map(([column]) => column);
		const numberTableColumns = Object.entries(data.combinedSchema)
			.filter(([, type]) => type === 'number')
			.map(([column]) => column);
		this.filterOptions = {
			groupBy: {
				type: 'string',
				options: stringTableColumns,
				label: 'Group By'
			},
			xColumnName: {
				type: 'row',
				keys: ['xColumnName', 'scaleX'],
				grow: [0.7, 0.3],
				items: [
					{
						type: 'string',
						options: numberTableColumns,
						label: 'X Axis'
					},
					{
						type: 'string',
						options: [DataScaling.LINEAR, DataScaling.LOG],
						label: 'X Scale'
					}
				]
			},
			yColumnName: {
				type: 'row',
				keys: ['yColumnName', 'scaleY'],
				grow: [0.7, 0.3],
				items: [
					{
						type: 'string',
						options: numberTableColumns,
						label: 'Y Axis'
					},
					{
						type: 'string',
						options: [DataScaling.LINEAR, DataScaling.LOG],
						label: 'Y Scale'
					}
				]
			},
			zColumnName: {
				type: 'row',
				keys: ['zColumnName', 'scaleZ'],
				grow: [0.7, 0.3],
				items: [
					{
						type: 'string',
						options: numberTableColumns,
						label: 'Z Axis'
					},
					{
						type: 'string',
						options: [DataScaling.LINEAR, DataScaling.LOG],
						label: 'Z Scale'
					}
				]
			},
			tileCount: {
				type: 'number',
				options: [2, 128],
				label: 'Tile Count'
			}
			// zTileCount: {
			// 	type: 'number',
			// 	options: [2, 128],
			// 	label: 'Z Tile Count'
			// }
		};
	}

	public getType(): GraphType {
		return GraphType.PLANE;
	}

	public getCurrentOptions() {
		return get(this._optionsStore);
	}

	public async getGlobalRange(
		columnName: string,
		scaling: DataScaling
	): Promise<ValueRange | null> {
		const data = get(dataStore);
		const tables = Object.keys(data.tables);

		try {
			const result = await Promise.all(
				tables.map((table) => dataStore.getMinMax(table, columnName, scaling))
			);
			return result.reduce(
				(acc, [min, max]) => [Math.min(acc[0], min), Math.max(acc[1], max)],
				[0, -Infinity]
			);
		} catch {
			return null;
		}
	}

	public async applyOptionsIfValid() {
		const state = get(this._optionsStore);
		if (state.isValid !== true) {
			return;
		}

		// Get available tables
		const data = get(dataStore);

		// Get all layers
		try {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			// const options = await dataStore.getDistinctValues('bloom', state.groupBy);
			const tables = Object.keys(data.tables);

			const xAxisRange = await this.getGlobalRange(state.xColumnName, state.scaleX);
			const yAxisRange = await this.getGlobalRange(state.yColumnName, state.scaleY);
			const zAxisRange = await this.getGlobalRange(state.zColumnName, state.scaleZ);
			if (!xAxisRange || !yAxisRange || !zAxisRange) {
				notificationStore.error({ message: 'Data ranges in data invalid' });
				return;
			}

			console.log('Z axis min/max', zAxisRange);
			console.log('X axis min/max', xAxisRange);
			console.log('Y axis min/max', yAxisRange);

			const promise = await Promise.all(
				tables.map((table) =>
					dataStore.getTiledData(
						table,
						state as RequiredOptions,
						xAxisRange,
						yAxisRange,
						zAxisRange
					)
				)
			);

			// If group by set also query groupBy data
			const childLayers = await Promise.all(
				tables.map(async (table) => {
					const values = await dataStore.getDistinctValues(table, state.groupBy);
					if (values.length > 20) {
						const error = `Too many options returned by group by number=${values.length} (limit 10)`;
						notificationStore.error({
							message: error
						});
						throw new Error(error);
					}

					const data = await Promise.all(
						values.map((value) =>
							dataStore.getTiledData(
								table,
								state as RequiredOptions,
								xAxisRange,
								yAxisRange,
								zAxisRange,
								{ columnName: state.groupBy, value: value as string }
							)
						)
					);

					return data.map((value, index) => ({
						points: value.data,
						min: value.min,
						max: value.max,
						name: values[index] as string,
						color: graphColors[index % graphColors.length],
						meta: {
							rows: value.queryResult
						}
					}));
				})
			);

			const layers = promise.map((data, index) => ({
				points: data.data,
				layers: childLayers[index],
				min: data.min,
				max: data.max,
				name: tables[index] as string,
				color: graphColors[index % graphColors.length],
				meta: {
					rows: data.queryResult
				}
			}));

			this._dataStore.set({
				layers,
				labels: {
					x: state.xColumnName,
					y: state.yColumnName,
					z: state.zColumnName
				},
				ranges: {
					x: xAxisRange,
					y: yAxisRange,
					z: zAxisRange
				},
				tileRange: {
					x: state.xTileCount ?? state.tileCount,
					z: state.zTileCount ?? state.tileCount
				}
			});
		} catch (e) {
			console.error('Failed to load tiled data:', e);
			return;
		}
	}
}
