import type {  Point3D } from '$lib/rendering/geometry/SparsePlaneGeometry';
import type { BaseStoreType } from './DataStore';
import { DataAggregation, DataScaling, type FilterOptions, type IDataStore } from './types';

export interface ITiledDataRow {
	mode: string;
	x: number;
	z: number;
	y: number;
	rawX: number;
	rawY: number;
	rawZ: number;
	name: string;
}

export type IQueryResult = {
	// data: number[][];
	points: Point3D[];
	min: number;
	max: number;
	tiles: [number, number];
	queryResult?: ITiledDataRow[];
}

export type MinValue = number;
export type MaxValue = number;
export type ValueRange = [MinValue, MaxValue];

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
	aggregation: DataAggregation;
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

	const defaultTiledDataOptions: ITiledDataOptions = {
		xColumnName: 'iterations',
		yColumnName: 'fpr',
		zColumnName: 'cpu_time',
		tileCount: 20,
		scaleY: DataScaling.LINEAR,
		scaleX: DataScaling.LINEAR,
		scaleZ: DataScaling.LINEAR,
		aggregation: DataAggregation.MIN
	};

	const getEntry = async (
		tableName: string,
		columnName: string,
		columnValue: string
	): Promise<Record<string, any> | undefined> => {
		const query = `SELECT * FROM "${tableName}" WHERE "${columnName}" = ${columnValue};`;

		const resp = await store.executeQuery(query);
		if (!resp) {
			throw new Error('Failed to get min/max');
		}

		const rows = resp.toArray();
		if (rows.length !== 1) {
			return undefined;
		}

		return rows[0] as Record<string, any>;
	};

	const getMinMax = async (
		tableName: string,
		columnName: string,
		scale: DataScaling
	): Promise<ValueRange> => {
		const query = `SELECT MIN(${getSqlScaleWrapper(
			scale,
			columnName,
			'"'
		)}) AS min, MAX(${getSqlScaleWrapper(scale, columnName, '"')}) AS max FROM "${tableName}"
		WHERE ${
			scale === DataScaling.LOG
				? `"${columnName}" >= 0 and "${columnName}" != 'NaN'`
				: `"${columnName}" != 'NaN'`
		}
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
		xRange?: ValueRange,
		yRange?: ValueRange,
		zRange?: ValueRange,
		where?: { columnName: string; value: string }
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

		const queryV2 = `
		SELECT x, y, z, name, "${options.xColumnName}" as rawX, "${options.yColumnName}" as rawY, "${
			options.xColumnName
		}" as rawX
		FROM "${tableName}" a
		RIGHT JOIN (
			SELECT 	FLOOR((${xColValue} - ${xMin}) / ${xBucketSize}) AS x,
					FLOOR((${zColValue} - ${zMin}) / ${zBucketSize}) AS z,
					${options.aggregation}(${yColValue}) AS y
			FROM "${tableName}"
			GROUP BY x, z
		) b ON a."${options.yColumnName}" = b.y
		WHERE "${options.yColumnName}" != 'NaN' and x != 'NaN' and z != 'NaN'
		${where ? `and "${where.columnName}" = '${where.value}'` : ''}
		${options.scaleY === DataScaling.LOG ? `and "${options.yColumnName}" >= 0` : ''}
		ORDER BY x ASC, z ASC ${where ? `, "${where.columnName}"` : ''}
		`;

		try {
			const resp = await store.executeQuery(queryV2);


			if (!resp) {
				// TODO: fix/handle this
				return [];
			}
			// TODO: move deduplication to DB for now simply do this in place
			return resp.toArray().filter((val, index, arr) => index === 0 ? true : val["x"] != arr[index-1]["x"] || val["z"] != arr[index-1]["z"] )
		} catch (e) {
			console.error(e);
			return [];
		}
	};

	const getTiledData = async (
		tableName: string,
		_options: Partial<ITiledDataOptions> = {},
		xRange?: ValueRange,
		yRange?: ValueRange,
		zRange?: ValueRange,
		where?: { columnName: string; value: string }
	): Promise<IQueryResult> => {
		const options = {
			...defaultTiledDataOptions,
			..._options
		};

		try {
			const rows = await getTiledRows(tableName, options, xRange, yRange, zRange, where);
			const points = rows.map(row => [row.x, row.z, row.y] as Point3D);
			const zDim = (options.zTileCount ?? options.tileCount) + 1;
			const xDim = (options.xTileCount ?? options.tileCount) + 1;


			let min = Number.MAX_VALUE;
			let max = Number.MIN_VALUE;

			rows.forEach((r, i) => {
				if (r.x < 0 || r.z < 0 || Number.isNaN(r.y)) {
					return;
				}
				min = Math.min(min, r.y);
				max = Math.max(max, r.y);
			});


			return {
				points,
				min,
				max,
				tiles: [xDim, zDim],
				queryResult: rows
			};
		} catch (e) {
			console.error('Failed to create tiled data:', e);
			return {
				points: [],
				min: 0,
				max: 0,
				tiles: [0, 0],
			};
		}
	};

	return {
		getFiltersOptions,
		getTiledData,
		getMinMax,
		getEntry
	};
};
