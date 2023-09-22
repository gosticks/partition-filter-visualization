import type { BaseStoreType } from './DataStore';
import { DataScaling, type FilterOptions, type IDataStore } from './types';
import { type Writable } from 'svelte/store';

interface ITiledDataRow {
	mode: string;
	x: number;
	z: number;
	y: number;
	name: string;
}

export type ITiledDataOptions = {
	xColumnName: string;
	yColumnName: string;
	zColumnName: string;
	xTileCount?: number;
	zTileCount?: number;
	tileCount: number;
	scaleY: DataScaling;
	scaleX: DataScaling;
	scaleZ: DataScaling;
};

// Store extension containing actions to load data, transform & drop data
export const dataStoreFilterExtension = (store: BaseStoreType) => {
	const getFiltersOptions = async (
		tableName: string,
		fields: string[] = []
	): Promise<FilterOptions> => {
		const responses = await Promise.all(
			fields.map((field) => store.getDistinctValues(tableName, field))
		);

		const options: FilterOptions = {};

		responses.forEach((values, i) => {
			const field = fields[i];

			options[field] = {
				options: values,
				type: values.length > 0 ? typeof values[0] : 'unknown'
			};
		});

		return options;
	};

	const getSqlScaleWrapper = (scale: DataScaling, inner: string, wrap = '') => {
		switch (scale) {
			case DataScaling.LINEAR:
				return `${wrap}${inner}${wrap}`;
			case DataScaling.LOG:
				return `LOG2(${wrap}${inner}${wrap})`;
		}
	};

	const defaultTiledDataOptions = {
		xColumnName: 'iterations',
		yColumnName: 'fpr',
		zColumnName: 'cpu_time',
		tileCount: 20,
		scaleY: DataScaling.LINEAR,
		scaleX: DataScaling.LINEAR,
		scaleZ: DataScaling.LINEAR
	};

	const getMinMax = async (
		tableName: string,
		columnName: string,
		scale: DataScaling
	): Promise<[number, number]> => {
		const query = `SELECT MIN(${getSqlScaleWrapper(
			scale,
			columnName,
			'"'
		)}) AS min, MAX(${getSqlScaleWrapper(scale, columnName, '"')}) AS max FROM ${tableName}
		${scale === DataScaling.LOG ? `WHERE "${columnName}" >= 0` : ''}
		`;

		const resp = await store.executeQuery(query);
		if (!resp) {
			throw new Error('Failed to get min/max');
		}

		const rows = resp.toArray();
		if (rows.length !== 1) {
			throw new Error('Invalid number of rows');
		}

		return [rows[0].min, rows[0].max];
	};

	const getTiledRows = async (
		tableName: string,
		options: ITiledDataOptions,
		tileAggregationMode: 'min' | 'max' | 'avg' | 'sum' = 'min',
		groupBy?: string,
		xRange?: [number, number],
		yRange?: [number, number],
		zRange?: [number, number]
	): Promise<ITiledDataRow[]> => {
		const xTileCount = options.xTileCount ?? options.tileCount;
		const zTileCount = options.zTileCount ?? options.tileCount;

		// Compute ranges for each axis
		const [xMin, xMax] =
			xRange ?? (await getMinMax(tableName, options.xColumnName, options.scaleX));
		const [zMin, zMax] =
			zRange ?? (await getMinMax(tableName, options.zColumnName, options.scaleZ));

		// Compute bucket aggregation sizes
		const xBucketSize = (xMax - xMin) / xTileCount;
		const zBucketSize = (zMax - zMin) / zTileCount;

		const xColValue = getSqlScaleWrapper(options.scaleX, options.xColumnName, '"');
		const zColValue = getSqlScaleWrapper(options.scaleZ, options.zColumnName, '"');
		const yColValue = getSqlScaleWrapper(options.scaleY, options.yColumnName, '"');

		// FIXME: this currently incorrectly pairs up x and z values within a mode/group
		const query = `
		SELECT
			${groupBy ? 'mode,' : ''}
			${tileAggregationMode}(${yColValue}) AS y,
			FLOOR((${xColValue} - ${xMin}) / ${xBucketSize}) AS x,
		   	FLOOR((${zColValue} - ${zMin}) / ${zBucketSize}) AS z
	FROM "${tableName}"
	${groupBy ? `WHERE mode = '${groupBy}'` : ''}
	${options.scaleY === DataScaling.LOG ? `WHERE "${options.yColumnName}" >= 0` : ''}
	GROUP BY ${groupBy ? 'mode,' : ''} z, x
	ORDER BY z ASC, x ASC;
	`;
		// GROUP BY ${groupBy ? 'mode,' : ''} z, x, name, "${options.zColumnName}", "${options.xColumnName}"
		// ORDER BY z ASC, x ASC;

		try {
			const resp = await store.executeQuery(query);
			if (!resp) {
				// TODO: fix/handle this
				return [];
			}
			return resp.toArray();
		} catch (e) {
			console.error(e);
			return [];
		}
	};

	const getTiledData = async (
		tableName: string,
		groupBy?: string,
		_options: Partial<ITiledDataOptions> = {},
		xRange?: [number, number],
		yRange?: [number, number],
		zRange?: [number, number]
	): Promise<{
		data: Float32Array[];
		min: number;
		max: number;
		queryResult?: ITiledDataRow[];
	}> => {
		const options = {
			...defaultTiledDataOptions,
			..._options
		};

		try {
			const rows = await getTiledRows(tableName, options, 'max', groupBy, xRange, yRange, zRange);

			console.log('Options', options);

			// Transform rows into a 2D array for display
			const data = Array.from(
				{ length: (options.xTileCount ?? options.tileCount) + 1 },
				() => new Float32Array((options.xTileCount ?? options.tileCount) + 1)
			);

			let min = Number.MAX_VALUE;
			let max = Number.MIN_VALUE;

			rows.forEach((r) => {
				if (r.x < 0 || r.z < 0 || Number.isNaN(r.y)) {
					return;
				}
				min = Math.min(min, r.y);
				max = Math.max(max, r.y);
				data[r.x][r.z] = r.y;
			});

			return {
				data,
				min,
				max,
				queryResult: rows
			};
		} catch (e) {
			console.error('Failed to create tiled data:', e);
			return {
				data: [],
				min: 0,
				max: 0
			};
		}
	};

	return {
		getFiltersOptions,
		getTiledData,
		getMinMax
	};
};
