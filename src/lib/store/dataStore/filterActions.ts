import type { Point3D } from '$lib/rendering/geometry/SparsePlaneGeometry';
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
	id: number;
}

export type IQueryResult = {
	// data: number[][];
	points: Point3D[];
	min: number;
	max: number;
	tiles: [number, number];
	queryResult?: ITiledDataRow[];
};

export type MinValue = number;
export type MaxValue = number;
export type ValueRange = [MinValue, MaxValue];

export type ITiledDataOptions = {
	xColumnName: string;
	yColumnName: string;
	zColumnName: string;
	xTileCount: number;
	zTileCount: number;
	lockTileCounts: boolean;
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
		const baseQuery = `SELECT MIN(${getSqlScaleWrapper(
			scale,
			columnName,
			'"'
		)}) AS min, MAX(${getSqlScaleWrapper(scale, columnName, '"')}) AS max FROM "${tableName}"
		${scale === DataScaling.LOG ? `WHERE "${columnName}" >= 0` : ``}`;
		const combinedQuery =
			baseQuery + `${scale === DataScaling.LOG ? ` and` : `where`} "${columnName}" != 'NaN'`;

		let resp = await store.executeQuery(combinedQuery);
		if (!resp) {
			throw new Error('Failed to get min/max');
		}

		let rows = resp.toArray();

		// If we have no results this might be that the value is of type Int64 which does not pass the NaN test
		if (rows.length !== 1 || rows[0].min === null || rows[0].max === null) {
			resp = await store.executeQuery(baseQuery);
			if (!resp) {
				throw new Error('Failed to get min/max');
			}
			rows = resp.toArray();
			if (rows.length !== 1) {
				throw new Error('Invalid number of rows');
			}
		}

		// FIXME: fails with BigInt
		return [Number(rows[0].min), Number(rows[0].max)];
	};

	const getTiledRows = async (
		tableName: string,
		options: ITiledDataOptions,
		xRange?: ValueRange,
		yRange?: ValueRange,
		zRange?: ValueRange,
		where?: { columnName: string; value: string }
	): Promise<ITiledDataRow[]> => {
		const xTileCount = options.xTileCount;
		const zTileCount = options.zTileCount;

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
		SELECT x, y, z, a.id, "${options.xColumnName}" as rawX, "${options.yColumnName}" as rawY, "${
			options.zColumnName
		}" as rawZ
		FROM "${tableName}" a
		RIGHT JOIN (
			SELECT 	FLOOR((${xColValue} - ${xMin}) / ${xBucketSize}) AS x,
					FLOOR((${zColValue} - ${zMin}) / ${zBucketSize}) AS z,
					${options.aggregation}(${yColValue}) AS y,
					min(id) as id
			FROM "${tableName}"
			${where ? `WHERE "${where.columnName}" = '${where.value}'` : ''}
			GROUP BY x, z
		) b ON a.id = b.id

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
			return resp
				.toArray()
				.filter((val, index, arr) =>
					index === 0 ? true : val['x'] != arr[index - 1]['x'] || val['z'] != arr[index - 1]['z']
				);
		} catch (e) {
			console.error(e);
			return [];
		}
	};

	// const bigIntMax = (...args: bigint[]) => args.reduce((m, e) => (e > m ? e : m));
	// const bigIntMin = (...args: bigint[]) => args.reduce((m, e) => (e < m ? e : m));

	const getTiledData = async (
		tableName: string,
		_options: Partial<ITiledDataOptions> = {},
		xRange?: ValueRange,
		yRange?: ValueRange,
		zRange?: ValueRange,
		where?: { columnName: string; value: string }
	): Promise<IQueryResult> => {
		const options = {
			..._options
		} as ITiledDataOptions;

		try {
			let rows = await getTiledRows(tableName, options, xRange, yRange, zRange, where);

			// drop invalid rows
			// needs to be done here since DB has issues with NaN and BigInt
			rows = rows.filter(
				(r) => !(Number.isNaN(r.x) || Number.isNaN(r.y) || Number.isNaN(r.z) || r.x < 0 || r.z < 0)
			);
			const points = rows.map((row) => [Number(row.x), Number(row.z), Number(row.y)] as Point3D); // wrap values in containers to handle BigInt data
			const zDim = options.zTileCount + 1;
			const xDim = options.xTileCount + 1;

			let min = Number.MAX_VALUE;
			let max = Number.MIN_VALUE;

			points.forEach(([_, __, y]) => {
				// use ternary to support big int
				min = min > y ? y : min;
				max = max < y ? y : max;
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
				tiles: [0, 0]
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
