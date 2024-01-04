import { writable, get } from 'svelte/store';
import { dataStoreLoadExtension } from './loadActions';
import { dataStorePostProcessingExtension } from './postProcessing';
import type { IDataStore, TableSchema } from './types';
import { browser } from '$app/environment';
import { dataStoreFilterExtension } from './filterActions';
import { AsyncDuckDB, ConsoleLogger, LogLevel } from '@duckdb/duckdb-wasm';
import { withLogMiddleware } from '../logMiddleware';

const initialStore: IDataStore = {
	db: null,
	isLoading: false,
	sharedConnection: null,
	tables: {},
	combinedSchema: {},
	previousQueries: []
};

const _baseStore = () => {
	console.log('Initializing data store');
	const store = withLogMiddleware(writable<IDataStore>(initialStore), 'DataStore');
	// const store = writable<IDataStore>(initialStore);

	const { set, update, subscribe } = store;

	const setIsLoading = (isLoading: boolean) => {
		update((store) => {
			store.isLoading = isLoading;
			return store;
		});
	};
	let promise: Promise<AsyncDuckDB> | null = null;

	if (browser) {
		// The first time store is created initialize duckdb
		const initDuckDB = async () => {
			const { db } = get(store);
			if (db) {
				console.log('Database already initialized');
				return db; // Return existing database, if any
			}

			setIsLoading(true);

			// Dynamically import duckdb wasm
			const duckdbWasm = await import('@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url').then(
				(m) => m.default
			);
			const duckdbWorker = await import(
				'@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?worker'
			).then((m) => m.default);

			// Instantiate worker
			const logger = new ConsoleLogger(LogLevel.WARNING);
			const worker = new duckdbWorker();

			// and asynchronous database
			const newDbInstance = new AsyncDuckDB(logger, worker);
			await newDbInstance.instantiate(duckdbWasm);

			const conn = await newDbInstance.connect();

			update((store) => {
				store.db = newDbInstance;
				store.isLoading = false;
				store.sharedConnection = conn;
				return store;
			});
			console.debug('Initialized duckdb');
			return newDbInstance;
		};

		// Initialize duckdb only on client
		promise = initDuckDB();
	}

	const withQueryLogger = async <T>(query: string, promise: Promise<T>): Promise<T> => {
		const start = performance.now();
		let result: T | undefined;
		let err: unknown;
		try {
			result = await promise;
		} catch (e) {
			err = e;
		} finally {
			const end = performance.now();
			// Push query to history
			update((store) => {
				store.previousQueries.push({
					query,
					success: err === undefined,
					executionTime: end - start
				});
				return store;
			});
		}

		if (err) {
			throw err;
		}

		return result!;
	};

	const executeQuery = async (query: string) => {
		try {
			await promise;
		} catch (e) {
			console.error('Failed to initialize duckdb:', e);
			return;
		}
		const { sharedConnection: conn } = get(store);
		if (!conn) {
			return;
		}

		return withQueryLogger(query, conn.query(query));
	};

	return {
		subscribe,
		set,
		update,
		rawStore: store,

		setIsLoading,

		// Add modifiers
		executeQuery,

		getConnection: async () => {
			try {
				await promise;
			} catch (e) {
				console.error('Failed to initialize duckdb:', e);
				return;
			}
			const { sharedConnection: conn } = get(store);
			if (!conn) {
				return;
			}

			return conn;
		},

		getTables: async (): Promise<string[]> => {
			const query = `SELECT table_name FROM information_schema.tables;`;

			try {
				const resp = await executeQuery(query);

				if (!resp) {
					return [];
				}

				return resp.toArray().map((row) => row['table_name']) as string[];
			} catch (e) {
				console.error(e);
				return [];
			}
		},

		getTableSchema: async (tableName: string): Promise<TableSchema> => {
			const query = `DESCRIBE SELECT * FROM "${tableName}";`;

			try {
				const resp = await executeQuery(query);

				if (!resp) {
					return {};
				}

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
		},

		getDistinctValues: async <T = unknown>(tableName: string, columnName: string): Promise<T[]> => {
			try {
				const resp = await executeQuery(`SELECT DISTINCT "${columnName}" FROM "${tableName}"`);
				if (!resp) {
					return [];
				}

				return resp.toArray().map((row) => row[columnName]) as T[];
			} catch (e) {
				return [];
			}
		}
	};
};

export type BaseStoreType = ReturnType<typeof _baseStore>;
export type DataStoreType = ReturnType<typeof _dataStore>;

const _dataStore = () => {
	const store = _baseStore();

	// Execute extension
	const extendedStore = {
		...store,
		...dataStoreLoadExtension(store, store.rawStore),
		...dataStoreFilterExtension(store)
		// FIXME: due to tigh coupling between load and post processing this
		// is loaded by the load module. Probably should be changed
		//...dataStorePostProcessingExtension(store, store.rawStore)
	};

	return extendedStore;
};

export const dataStore = _dataStore();
