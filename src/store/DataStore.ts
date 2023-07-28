import * as duckdb from '@duckdb/duckdb-wasm';
import duckdbWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import duckdbWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?worker';

import type { AsyncDuckDB } from '@duckdb/duckdb-wasm';
import { useWritable } from './utils';
import { browser } from '$app/environment';

const uniqueStoreName = 'dataStore';

let db: AsyncDuckDB | null = null;
let loading = false;

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
			// FIXME: remove after debug
			// add db to window object for use in console
			// @ts-ignore
			window.db = db;

			console.debug('DuckDB instantiated', db);
			set(db);
		});

		return () => {
			console.debug('useDataStore cleanup');
			db?.terminate();
			db = null;
		};
	});
