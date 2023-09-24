import type { IPlaneChildData, IPlaneRendererData } from '$lib/rendering/PlaneRenderer';
import { dataStore } from '$lib/store/dataStore/DataStore';
import { get, readonly, writable, type Readable, type Writable } from 'svelte/store';
import { GraphOptions, GraphType } from '../types';
import { DataScaling } from '$lib/store/dataStore/types';
import { colorBrewer, graphColors } from '$lib/rendering/colors';
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
			...initialState,
			isRendered: false,
			isValid: this.isValid(initialState)
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
					console.log('URL decoded state', state);
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
		const isValid = Object.entries(this.filterOptions).every(([key, value]) => {
			if (value.type === 'row') {
				return value.keys.every((key, index) =>
					value.items[index].required ? state[key] !== undefined : true
				);
			}

			return value.required ? state[key as keyof RequiredOptions] !== undefined : true;
		});

		console.log({ isValid });

		return isValid;
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
						label: 'X Axis',
						required: true
					},
					{
						type: 'string',
						options: [DataScaling.LINEAR, DataScaling.LOG],
						label: 'X Scale',
						required: true
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
						label: 'Y Axis',
						required: true
					},
					{
						type: 'string',
						options: [DataScaling.LINEAR, DataScaling.LOG],
						label: 'Y Scale',
						required: true
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
						label: 'Z Axis',
						required: true
					},
					{
						type: 'string',
						options: [DataScaling.LINEAR, DataScaling.LOG],
						label: 'Z Scale',
						required: true
					}
				]
			},
			tileCount: {
				type: 'number',
				options: [2, 128],
				label: 'Tile Count',
				required: true
			}
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
		console.log('applying store', state);
		if (state.isValid !== true) {
			return;
		}

		// Get available tables
		const data = get(dataStore);

		// Get all layers
		try {
			const tables = Object.keys(data.tables);

			const xAxisRange = await this.getGlobalRange(state.xColumnName, state.scaleX);
			const yAxisRange = await this.getGlobalRange(state.yColumnName, state.scaleY);
			const zAxisRange = await this.getGlobalRange(state.zColumnName, state.scaleZ);
			if (!xAxisRange || !yAxisRange || !zAxisRange) {
				notificationStore.error({
					message: 'Data range invalid',
					description: JSON.stringify({
						column: state.xColumnName,
						xAxisRange,
						yAxisRange,
						zAxisRange
					})
				});
				return;
			}

			console.debug('axis ranges', {
				xAxisRange,
				yAxisRange,
				zAxisRange
			});

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
			const childLayers = await Promise.all<IPlaneChildData[]>(
				tables.map(async (table) => {
					const values = await dataStore.getDistinctValues(table, state.groupBy);
					if (values.length > 30) {
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
						isChild: true,
						name: values[index] as string,
						color: colorBrewer.Set2[8][index % colorBrewer.Set2[8].length],
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
				color: colorBrewer.Set3[12][index % colorBrewer.Set3[12].length],
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
