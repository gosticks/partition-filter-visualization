import duckdbWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import duckdbWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?worker';

import { writable, get } from 'svelte/store';
import { dataStoreLoadExtension } from './loadActions';
import type { IDataStore, TableSchema } from './types';
import { browser } from '$app/environment';
import { dataStoreFilterExtension } from './filterActions';
import { AsyncDuckDB, ConsoleLogger, LogLevel } from '@duckdb/duckdb-wasm';

const _baseStore = () => {
	const store = writable<IDataStore>({
		db: null,
		isLoading: false,
		sharedConnection: null,
		tables: {},
		commonFilterOptions: {},
		combinedSchema: {},
		previousQueries: []
	});

	const { set, update, subscribe } = store;

	const setIsLoading = (isLoading: boolean) => {
		update((store) => {
			store.isLoading = isLoading;
			return store;
		});
	};

	// The first time store is created initialize duckdb
	const initDuckDB = async () => {
		const { db } = get(store);
		if (db) {
			console.log('Database already initialized');
			return db; // Return existing database, if any
		}

		setIsLoading(true);

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

		return newDbInstance;
	};

	const executeQuery = async (query: string) => {
		const { sharedConnection: conn } = get(store);
		if (!conn) {
			return;
		}

		// Push query to history
		update((store) => {
			store.previousQueries.push(query);
			return store;
		});

		return conn.query(query);
	};

	// Initialize duckdb only on client
	if (browser) {
		initDuckDB();
	}

	return {
		subscribe,
		set,
		update,
		rawStore: store,

		setIsLoading,

		// Add modifiers
		executeQuery,

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

const _dataStore = () => {
	const store = _baseStore();

	// Execute extension
	return {
		...store,
		...dataStoreLoadExtension(store, store.rawStore),
		...dataStoreFilterExtension(store, store.rawStore)
	};
};

export const dataStore = _dataStore();
