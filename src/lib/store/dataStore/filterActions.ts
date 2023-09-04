import type { BaseStoreType } from './DataStore';
import type { FilterOptions } from './types';
import { get, type Writable } from 'svelte/store';

// Store extension containing actions to load data, transform & drop data
export const dataStoreFilterExtension = (store: BaseStoreType, dataStore: Writable<IDataStore>) => {
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

	const getTiledRows = async (
		tableName: string,
		mode: string,
		options: {
			xColumnName: string;
			yColumnName: string;
			zColumnName: string;
			xTileCount: number;
			zTileCount: number;
		}
	): Promise<
		{
			mode: string;
			x: number;
			z: number;
			y: number;
			name: string;
		}[]
	> => {
		// FIXME: this currently incorrectly pairs up x and z values within a mode/group
		const query = `WITH
	${options.xColumnName}_min_max AS (
		SELECT MIN(${options.xColumnName}) AS min_${options.xColumnName}, MAX(${options.xColumnName}) AS max_${options.xColumnName}
		FROM "${tableName}"
	),
	${options.zColumnName}_min_max AS (
		SELECT MIN(${options.zColumnName}) AS min_${options.zColumnName}, MAX(${options.zColumnName}) AS max_${options.zColumnName}
		FROM "${tableName}"
	),
	${options.xColumnName}_bucket_sizes AS (
		SELECT (max_${options.xColumnName} - min_${options.xColumnName}) / ${options.xTileCount} AS ${options.xColumnName}_bucket_size
		FROM ${options.xColumnName}_min_max
	),
	${options.zColumnName}_bucket_sizes AS (
		SELECT (max_${options.zColumnName} - min_${options.zColumnName}) / ${options.zTileCount} AS ${options.zColumnName}_bucket_size
		FROM ${options.zColumnName}_min_max
	)
	SELECT mode,
		   MIN(${options.yColumnName}) AS y,
		   FLOOR((${options.xColumnName} - min_${options.xColumnName}) / ${options.xColumnName}_bucket_size) AS x,
		   FLOOR((${options.zColumnName} - min_${options.zColumnName}) / ${options.zColumnName}_bucket_size) AS z,
		   MIN(${options.xColumnName}) as min_${options.xColumnName},
		   MIN(${options.zColumnName}) as min_${options.zColumnName}
	FROM "${tableName}"
	CROSS JOIN ${options.xColumnName}_min_max
	CROSS JOIN ${options.xColumnName}_bucket_sizes
	CROSS JOIN ${options.zColumnName}_min_max
	CROSS JOIN ${options.zColumnName}_bucket_sizes
	WHERE mode = '${mode}'
	GROUP BY mode, x, z, name
	ORDER BY x ASC, z ASC`;

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
		mode: string,
		options: {
			xColumnName: string;
			yColumnName: string;
			zColumnName: string;
			xTileCount: number;
			zTileCount: number;
		}
	) => {
		try {
			const rows = await getTiledRows(tableName, mode, options);

			// Transform rows into a 2D array for display
			const data = Array.from(
				{ length: options.xTileCount },
				() => new Float32Array(options.zTileCount)
			);

			rows.forEach((r) => {
				const x = Math.min(r.x, options.xTileCount - 1);
				const z = Math.min(r.z, options.zTileCount - 1);
				data[x][z] = r.y;
			});

			return data;
		} catch (e) {
			console.error('Failed to create tiled data:', e);
			return [];
		}
	};

	return {
		getFiltersOptions,
		getTiledData
	};
};
