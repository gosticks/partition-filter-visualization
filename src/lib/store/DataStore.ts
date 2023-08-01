import * as duckdb from '@duckdb/duckdb-wasm';
import duckdbWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import duckdbWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?worker';

import type { AsyncDuckDB } from '@duckdb/duckdb-wasm';
import { useWritable } from './utils';
import { browser } from '$app/environment';

const uniqueStoreName = 'dataStore';

let db: AsyncDuckDB | null = null;
let loading = false;
let sharedConnection: duckdb.AsyncDuckDBConnection | null = null;

const loadedTables: string[] = [];

const connect = async () => {
	if (!db) {
		throw new Error('Database not initialized');
	}

	if (sharedConnection) {
		return sharedConnection;
	}

	const conn = await db.connect();
	sharedConnection = conn;
	return conn;
};

export const initDuckDB = async () => {
	if (db) {
		return db; // Return existing database, if any
	}

	// Instantiate worker
	const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.DEBUG);
	const worker = new duckdbWorker();

	// and asynchronous database
	db = new duckdb.AsyncDuckDB(logger, worker);
	await db.instantiate(duckdbWasm);
	return db;
};

export const useDataStore = () =>
	useWritable<AsyncDuckDB | undefined>(uniqueStoreName, undefined, (set) => {
		if (loading || !browser) {
			return;
		}
		console.debug('useDataStore');
		loading = true;

		initDuckDB().then((db) => {
			set(db);
		});
	});

export const loadCSV = async (
	path: string,
	tableName: string,
	connection?: duckdb.AsyncDuckDBConnection
) => {
	const conn = connection || (await connect());

	return conn
		.insertCSVFromPath(path, {
			name: tableName,
			detect: true,
			create: loadedTables.indexOf(tableName) === -1
		})
		.then(() => {
			console.log(`Table ${tableName} from ${path} loaded`);
			loadedTables.push(tableName);
		})
		.catch((err) => {
			console.error(`Failed to load table ${tableName} at ${path}: ${err}`);
			throw err;
		});
};

export const rewriteEntries = async (
	tableName: string,
	connection?: duckdb.AsyncDuckDBConnection
) => {
	const conn = connection || (await connect());

	const rewriteQuery = `
ALTER TABLE "${tableName}" ADD COLUMN family TEXT;
ALTER TABLE "${tableName}" ADD COLUMN mode TEXT;
ALTER TABLE "${tableName}" ADD COLUMN vectorization TEXT;
ALTER TABLE "${tableName}" ADD COLUMN fixture TEXT;
ALTER TABLE "${tableName}" ADD COLUMN s FLOAT;
ALTER TABLE "${tableName}" ADD COLUMN n_threads INTEGER;
ALTER TABLE "${tableName}" ADD COLUMN n_partitions INTEGER;
ALTER TABLE "${tableName}" ADD COLUMN n_elements_build INTEGER;
ALTER TABLE "${tableName}" ADD COLUMN n_elements_lookup INTEGER;
ALTER TABLE "${tableName}" ADD COLUMN shared_elements FLOAT;

WITH SplitValues AS (
	SELECT
	name,
	SPLIT_PART(name, '_', 1) AS family,
	SPLIT_PART(name, '_', 2) AS mode,
	SPLIT_PART(name, '_', 4) AS vectorization,
	SPLIT_PART(name, '/', 2) AS fixture,
	CAST(SPLIT_PART(name, '/', 3) AS FLOAT) / 100 AS s,
	CAST(SPLIT_PART(name, '/', 4) AS INTEGER) AS n_threads,
	CAST(SPLIT_PART(name, '/', 5) AS INTEGER) AS n_partitions,
	CAST(SPLIT_PART(name, '/', 6) AS INTEGER) AS n_elements_build,
	CAST(SPLIT_PART(name, '/', 7) AS INTEGER) AS n_elements_lookup,
	CAST(SPLIT_PART(name, '/', 8) AS FLOAT) / 100 AS shared_elements
	FROM "${tableName}")
UPDATE "${tableName}" AS t
	SET
		family = sv.family,
		mode = sv.mode,
		vectorization = sv.vectorization,
		fixture = sv.fixture,
		s = sv.s,
		n_threads = sv.n_threads,
		n_partitions = sv.n_partitions,
		n_elements_build = sv.n_elements_build,
		n_elements_lookup = sv.n_elements_lookup,
shared_elements = sv.shared_elements
FROM SplitValues AS sv
WHERE t.name = sv.name;
	`;

	return conn.query(rewriteQuery);
};

const filterQueryFields: string[] = [
	'family',
	'mode',
	'vectorization',
	's',
	'n_threads',
	'n_partitions',
	'size',
	'n_elements_lookup'
];

export type FilterOptions = Record<string, { options: unknown[]; type: string }>;

export const getFiltersOptions = async (
	tableName: string,
	fields: string[] = filterQueryFields,
	connection?: duckdb.AsyncDuckDBConnection
): Promise<FilterOptions> => {
	const conn = connection || (await connect());

	const responses = await Promise.all(
		fields.map((field) => executeQuery(`SELECT DISTINCT ${field} FROM "${tableName}"`, conn))
	);

	const options: FilterOptions = {};

	responses.forEach((resp, i) => {
		const field = fields[i];
		const values = resp.toArray().map((row) => row[field]);
		options[field] = {
			options: values as unknown[],
			type: values.length > 0 ? typeof values[0] : 'unknown'
		};
	});

	return options;
};

export type TableSchema = Record<string, 'number' | 'string'>;
export const getTableSchema = async (
	tableName: string,
	connection?: duckdb.AsyncDuckDBConnection
): Promise<TableSchema> => {
	const conn = connection || (await connect());

	const query = `DESCRIBE SELECT * FROM "${tableName}";`;

	try {
		const resp = await conn.query(query);
		const schema: TableSchema = {};
		resp.toArray().forEach((row) => {
			switch (row['column_type']) {
				case 'INTEGER':
				case 'BIGINT':
				case 'SMALLINT':
				case 'TINYINT':
				case 'FLOAT':
				case 'DOUBLE':
					schema[row['column_name']] = 'number';
					break;
				default:
					schema[row['column_name']] = 'string';
			}
		});
		return schema;
	} catch (e) {
		console.error(e);
		return {};
	}
};

// export const getTiledData = async (
// 	tableName: string,
// 	options: {
// 		groupBy: string;
// 		groupByOptions: string[];
// 		xColumnName: string;
// 		zColumnName: string;
// 		xTileCount: number;
// 		zTileCount: number;
// 	},
// 	connection?: duckdb.AsyncDuckDBConnection
// ): Promise<Record<string, unknown>[]> => {
// 	const conn = connection || (await connect());
// 	const query = `
// WITH RankedData AS (
// 	SELECT
// 		name,
// 		mode,
// 		${xColumnName},
// 		${zColumnName},
// 		NTILE(${numTiles})
// 	OVER
// 		(ORDER BY ${xColumnName}, ${zColumnName})
// 	AS chunk FROM "${tableName}")
// 	WHERE mode =
// SELECT
// 	mode,
// 	k,
// 	s,
// 	MAX(${xColumnName}) AS highest_${xColumnName},
// 	chunk
// FROM RankedData
// GROUP BY mode, chunk
// `;

// 	console.log(query);

// 	try {
// 		const resp = await executeQuery(query, conn);
// 		return resp.toArray();
// 	} catch (e) {
// 		console.error(e);
// 		return [];
// 	}
// };

export const getTables = async (connection: duckdb.AsyncDuckDBConnection): Promise<string[]> => {
	const conn = connection || (await connect());

	const query = `SELECT name FROM information_schema.tables;`;

	try {
		const resp = await conn.query(query);
		return resp.toArray().map((row) => row['name']) as string[];
	} catch (e) {
		console.error(e);
		return [];
	}
};

export const executeQuery = async (query: string, connection: duckdb.AsyncDuckDBConnection) => {
	const conn = connection || (await connect());

	return await conn.query(query);
};
