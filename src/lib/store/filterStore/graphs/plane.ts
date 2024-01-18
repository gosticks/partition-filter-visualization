import {
	PlaneRenderer,
	type IPlaneChildData,
	type IPlaneRenderOptions,
	type IPlaneRendererData,
	PlaneTriangulation,
	DataDisplayType,
	type IPlaneData
} from '$lib/rendering/PlaneRenderer';
import { dataStore } from '$lib/store/dataStore/DataStore';
import { get, readonly, writable, type Readable, type Writable } from 'svelte/store';
import { GraphOptions, GraphType, type GraphFilterOptions } from '../types';
import { DataAggregation, DataScaling, type ILoadedTable } from '$lib/store/dataStore/types';
import { colorBrewer } from '$lib/rendering/colors';
import type { ITiledDataOptions, ValueRange } from '$lib/store/dataStore/filterActions';
import { withLogMiddleware } from '$lib/store/logMiddleware';
import notificationStore from '$lib/store/notificationStore';

type RequiredOptions = ITiledDataOptions & {
	groupBy?: string;
};

export type IPlaneGraphState = (
	| ({
			isValid: true;
	  } & RequiredOptions)
	| ({
			isValid: false;
	  } & Partial<RequiredOptions>)
) & { isRendered: boolean };

const defaultInitialState = {};

export class PlaneGraphModel extends GraphOptions<
	Partial<RequiredOptions>,
	IPlaneRenderOptions,
	IPlaneRendererData | undefined
> {
	private _dataStore: Writable<IPlaneRendererData | undefined>;
	private _optionsStore: Writable<IPlaneGraphState>;

	public dataStore: Readable<IPlaneRendererData | undefined>;
	public optionsStore: Readable<Partial<RequiredOptions>>;

	private _renderOptions: Writable<IPlaneRenderOptions>;
	public renderStore: Readable<IPlaneRenderOptions>;

	private renderOptionFields: GraphFilterOptions<IPlaneRenderOptions> = {
		xAxisDataType: {
			type: 'string',
			label: 'X Axis type',
			default: DataDisplayType.number,
			options: Object.values(DataDisplayType)
		},
		yAxisDataType: {
			type: 'string',
			label: 'Y Axis type',
			default: DataDisplayType.number,
			options: Object.values(DataDisplayType)
		},
		zAxisDataType: {
			type: 'string',
			label: 'Z Axis type',
			default: DataDisplayType.number,
			options: Object.values(DataDisplayType)
		},
		showSelection: {
			type: 'boolean',
			label: 'Render value dots',
			default: true,
			required: true
		},
		pointCloudColor: {
			type: 'color',
			label: 'Value point color',
			default: '#ffffff'
		},
		pointCloudSize: {
			type: 'number?',
			label: 'Point cloud size',
			toggleLabel: 'Custom point size',
			options: [0.001, 0.03],
			default: 0.01,
			step: 0.001
		},
		triangulation: {
			type: 'string',
			label: 'Triangulation',
			options: Object.values(PlaneTriangulation),
			required: true
		}
	};

	public getRenderOptionFields() {
		return this.renderOptionFields;
	}

	constructor(
		initialState: Partial<RequiredOptions> = defaultInitialState,
		renderSettings: Partial<IPlaneRenderOptions> = {}
	) {
		super({});

		console.log({ initialState, renderSettings });

		this._dataStore = writable(undefined);
		this.dataStore = readonly(this._dataStore);

		this._renderOptions = writable({
			...PlaneRenderer.defaultRenderOptions(),
			...renderSettings
		} as IPlaneRenderOptions);
		this.renderStore = readonly(this._renderOptions);

		// Check if options are initially valid
		const initialOptions = {
			...initialState,
			isRendered: false,
			isValid: this.isValid(initialState)
		} as IPlaneGraphState;

		this._optionsStore = withLogMiddleware(writable(initialOptions), 'PlaneGraphModel', {
			color: 'orange'
		});

		this.optionsStore = readonly(this._optionsStore);
		this.reloadFilterOptions();

		// if no default init was passed in attempt to init with some data based defaults
		if (initialState === defaultInitialState || Object.keys(initialState).length === 0) {
			this.resetOptions();
		} else {
			// trigger re render of UI components
			// and other events depending on state
			this._dataStore.update((state) => state);
		}

		this.applyOptionsIfValid();
	}

	public toStateObject() {
		return {
			data: this.getCurrentOptions(),
			render: get(this._renderOptions)
		};
	}

	public description(): string | null {
		const state = get(this._optionsStore);
		if (!state.isValid) {
			return null;
		}
		return `${this.getType()}-${state.xColumnName}-${state.yColumnName}-${state.zColumnName}-${
			state.xTileCount
		}x${state.zTileCount}`;
	}

	public setFilterOption = <K extends keyof RequiredOptions>(key: K, value: RequiredOptions[K]) => {
		this._optionsStore.update((store) => {
			(store as Partial<RequiredOptions>)[key] = value;
			if (key === 'lockTileCounts') {
				store.zTileCount = store.xTileCount;
			}
			if (store.lockTileCounts === true) {
				if (key === 'xTileCount') {
					store.zTileCount = value as number;
				} else if (key === 'zTileCount') {
					store.xTileCount = value as number;
				}
			}
			store.isValid = this.isValid(store);
			return store;
		});

		this.applyOptionsIfValid();
	};

	public setRenderOption = <K extends keyof IPlaneRenderOptions>(
		key: K,
		value: IPlaneRenderOptions[K]
	) => {
		this._renderOptions.update((state) => {
			state[key] = value;
			return state;
		});
		this.applyOptionsIfValid();
	};

	// Utility method to check if current user input results in a valid graph state
	private isValid(state: Partial<RequiredOptions> | undefined): boolean {
		if (!state) {
			return false;
		}

		if (Object.keys(state).length === 0) {
			return false;
		}

		const isValid = Object.entries(this.filterOptionFields).every(([key, value]) => {
			if (value.type === 'row') {
				return value.keys.every((key, index) =>
					value.items[index].required ? state[key] !== undefined : true
				);
			}

			return value.required ? state[key as keyof RequiredOptions] !== undefined : true;
		});

		return isValid;
	}

	private resetOptions() {
		this._optionsStore.update((state) => {
			for (const [k, v] of Object.entries(this.filterOptionFields)) {
				console.log('setting', { k, v });
				if (v.type === 'row') {
					v.keys.forEach((key, index) => {
						(state as any)[key as keyof RequiredOptions] = v.items[index].default;
					});
				} else {
					(state as any)[k as keyof RequiredOptions] = v.default;
				}
			}
			state.isValid = this.isValid(state);
			return state;
		});
	}

	// performs a DB query and constructs UI Options that will be used for dropdowns and other components
	// to configure a given graph
	public reloadFilterOptions() {
		const data = get(dataStore);
		const stringTableColumns = Object.entries(data.combinedSchema)
			.filter(([, type]) => type === 'string')
			.map(([column]) => column);
		const numberTableColumns = Object.entries(data.combinedSchema)
			.filter(([, type]) => type === 'number')
			.map(([column]) => column);
		console.log({ numberTableColumns });
		this.filterOptionFields = {
			groupBy: {
				type: 'string',
				options: [...stringTableColumns, ...numberTableColumns],
				label: 'Group By'
			},
			aggregation: {
				type: 'string',
				label: 'Aggregation',
				required: true,
				options: Object.values(DataAggregation),
				default: DataAggregation.MIN
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
						required: true,
						default: numberTableColumns.length > 1 ? numberTableColumns[1] : undefined
					},
					{
						type: 'string',
						options: Object.values(DataScaling),
						label: 'X Scale',
						required: true,
						default: DataScaling.LINEAR
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
						required: true,
						default: numberTableColumns.length > 1 ? numberTableColumns[1] : undefined
					},
					{
						type: 'string',
						options: Object.values(DataScaling),
						label: 'Y Scale',
						required: true,
						default: DataScaling.LINEAR
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
						required: true,
						default: numberTableColumns.length > 1 ? numberTableColumns[1] : undefined
					},
					{
						type: 'string',
						options: Object.values(DataScaling),
						label: 'Z Scale',
						required: true,
						default: DataScaling.LINEAR
					}
				]
			},
			xTileCount: {
				type: 'number',
				options: [2, 256],
				label: 'X Tile Count',
				required: true,
				default: 24
			},
			zTileCount: {
				type: 'number',
				options: [2, 256],
				label: 'Z Tile Count',
				required: true,
				default: 24
			},
			lockTileCounts: {
				type: 'boolean',
				label: 'Lock tile counts',
				required: false,
				default: true
			}
		};
	}

	public getType(): GraphType {
		return GraphType.PLANE;
	}

	public getCurrentOptions() {
		return get(this._optionsStore);
	}
	// if options are valid dataStore will be updated with new values
	// dataStore is used for actual rendering
	public async applyOptionsIfValid() {
		const state = get(this._optionsStore);
		if (state.isValid !== true) {
			return;
		}

		const ranges = await this.getGlobalRanges();
		if (ranges === null) {
			return;
		}
		const [xAxisRange, yAxisRange, zAxisRange] = ranges;

		// Get available tables
		const data = get(dataStore);
		const tables = Object.entries(data.tables);
		const hasGroupBy = state.groupBy !== null && state.groupBy !== undefined;

		// Get all layers
		try {
			const promise = await Promise.all(
				tables.map(([_, table]) =>
					dataStore.getTiledData(
						table.tableName,
						state as RequiredOptions,
						xAxisRange,
						yAxisRange,
						zAxisRange
					)
				)
			);

			// If group by set also query groupBy data
			const childLayers = hasGroupBy
				? await Promise.all(
						tables.map(([_, table]) => this.queryGroupedLayers(table, state.groupBy!, ranges))
				  )
				: null;

			const layers = promise.map(
				(data, index) =>
					({
						points: data.points,
						layers: childLayers?.[index],
						min: data.min,
						max: data.max,
						name: tables[index][1].displayName,
						table: tables[index][1],
						color: colorBrewer.Paired[12][index % colorBrewer.Paired[12].length],
						meta: {
							rows: data.queryResult
						}
					}) as IPlaneData
			);

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
					x: state.xTileCount,
					z: state.zTileCount
				},
				scales: {
					x: state.scaleX,
					y: state.scaleY,
					z: state.scaleZ
				}
			});
		} catch (e) {
			console.error('Failed to load tiled data:', e);
			return;
		}
	}

	public setColorForLayer(color: string, layerIndex: number, subLayerIndex?: number) {
		// FIXME: color is not persisted correctly

		let parentName = '';
		let subLayerName = '';

		this._dataStore.update((state) => {
			let l = state?.layers[layerIndex];
			parentName = l?.table.tableName ?? '';
			if (subLayerIndex !== undefined) {
				l = l?.layers?.at(subLayerIndex);
				subLayerName = `-${l?.table.tableName}`;
			}
			if (!l) {
				return state;
			}

			l.color = color;
			return state;
		});

		this._renderOptions.update((state) => {
			state[`color-${parentName}-${subLayerName}`] = color;
			return state;
		});
	}

	private async getGlobalRange(
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

	// Get ranges along all selected columns and all tables
	private async getGlobalRanges(): Promise<[ValueRange, ValueRange, ValueRange] | null> {
		const state = get(this._optionsStore);
		if (state.isValid !== true) {
			return null;
		}
		// Get all layers
		try {
			const xAxisRange = await this.getGlobalRange(state.xColumnName, state.scaleX);
			const yAxisRange = await this.getGlobalRange(state.yColumnName, state.scaleY);
			const zAxisRange = await this.getGlobalRange(state.zColumnName, state.scaleZ);
			if (!xAxisRange || !yAxisRange || !zAxisRange) {
				throw Error(`Data ranges empty, x:${xAxisRange}, y:${yAxisRange}, z:${zAxisRange}`);
			}

			return [xAxisRange, yAxisRange, zAxisRange];
		} catch (err) {
			notificationStore.error({
				message: `Could not compute data range: ${err}`,
				description: 'Verify databases are loaded correctly and contain the selected columns'
			});
			console.error({ msg: 'getGlobalRanges:', state });
			return null;
		}
	}

	private subLayerDisplayName = (table: ILoadedTable, groupByValue: string) => groupByValue;

	private async queryGroupedLayers(
		table: ILoadedTable,
		groupColumn: string,
		ranges: [ValueRange, ValueRange, ValueRange],
		groupValueLimit: number = 40
	): Promise<IPlaneChildData[]> {
		const state = get(this._optionsStore);
		if (state.isValid !== true) {
			return [];
		}

		const values = (await dataStore.getDistinctValues(table.tableName, groupColumn)) as string[];
		if (values.length > groupValueLimit) {
			throw Error(
				`Too many options for group by: col:${groupColumn} has ${values.length} distinct values`
			);
		}

		try {
			const data = await Promise.all(
				values.map((value) =>
					dataStore.getTiledData(
						table.tableName,
						state as RequiredOptions,
						ranges[0],
						ranges[1],
						ranges[2],
						{
							columnName: groupColumn,
							value: value as string
						}
					)
				)
			);

			return data.map(
				(value, index) =>
					({
						points: value.points,
						min: value.min,
						max: value.max,
						isChild: true,
						table,
						name: this.subLayerDisplayName(table, values[index]),
						groupByValue: values[index],
						color: colorBrewer.Set2[8][index % colorBrewer.Set2[8].length],
						meta: {
							rows: value.queryResult ?? []
						}
					}) as IPlaneChildData
			);
		} catch (err) {
			notificationStore.error({
				message: `${err}`
			});
			return [];
		}
	}
}
