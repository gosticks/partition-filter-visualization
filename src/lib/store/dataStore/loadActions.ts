import { get, type Writable } from 'svelte/store';
import type { BaseStoreType } from './DataStore';
import type { IDataStore, ITableEntry, TableSchema } from './types';
import { DuckDBDataProtocol } from '@duckdb/duckdb-wasm';
import { TableSource, type ITableReference } from '../filterStore/types';
import notificationStore from '../notificationStore';

// Store extension containing actions to load data, transform & drop data
export const dataStoreLoadExtension = (store: BaseStoreType, dataStore: Writable<IDataStore>) => {
	// Wrapper utility to set loading state
	const withLoading = async <T>(fn: () => Promise<T>) => {
		store.setIsLoading(true);
		try {
			return await fn();
		} finally {
			store.setIsLoading(false);
		}
	};

	const rewriteEntries = async (tableName: string) => {
		console.log('Rewriting entries for table:', tableName);
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

	UPDATE "${tableName}" as t
		SET fpr = 'NaN'
		WHERE fpr = -1;
		`;

		return store.executeQuery(rewriteQuery);
	};

	const addIndexColumn = async (tableName: string, columnName = 'id') => {
		console.log('Adding index column:', columnName);
		const addIndexQuery = `
	ALTER TABLE "${tableName}"
	ADD COLUMN "${columnName}" SERIAL PRIMARY KEY;
		`;

		return store.executeQuery(addIndexQuery);
	};

	const loadCsvFromFile = (file: File, tableName: string) =>
		withLoading(async () => {
			const conn = await store.getConnection();
			const { db } = get(dataStore);

			if (!db || !conn) {
				return;
			}

			store.setIsLoading(true);

			try {
				await db.registerFileHandle(tableName, file, DuckDBDataProtocol.BROWSER_FILEREADER, true);
				console.log('Registered file handle:', tableName);
			} catch (e) {
				const msg = `Failed to load table ${tableName} from file ${file.name}`;
				console.error(msg, e);
				notificationStore.error({
					message: msg,
					description: (e as Error)?.message
				});
				throw e;
			} finally {
				store.setIsLoading(false);
			}
		});

	const loadCsvFromUrl = async (
		path: string,
		tableName: string,
		shouldSetLoading = true,
		createTable = true,
		shouldUpdateTableList = true
	) => {
		const conn = await store.getConnection();

		if (!conn) {
			// TODO: add error handling
			return;
		}

		if (shouldSetLoading) {
			store.setIsLoading(true);
		}

		try {
			await conn.insertCSVFromPath(path, {
				name: tableName,
				detect: true,
				create: createTable
			});

			const schema = await store.getTableSchema(tableName);
			// const filterOptions = await getFiltersOptions(tableName, Object.keys(schema), conn);
			const tableEntry: ITableEntry = {
				name: tableName,
				dataUrl: path,
				schema,
				filterOptions: {}
			};

			if (shouldUpdateTableList) {
				// Update or replace table entry
				dataStore.update((store) => {
					store.tables[tableName] = tableEntry;
					return store;
				});
			}

			return tableEntry;
		} catch (e) {
			const msg = `Failed to load table ${tableName} from path ${path}`;
			console.error(msg, e);
			notificationStore.error({
				message: msg,
				description: (e as Error)?.message
			});
			throw e;
		} finally {
			if (shouldSetLoading) {
				store.setIsLoading(false);
			}
		}
	};

	const postProcessTable = async (tableName: string): Promise<ITableEntry | undefined> => {
		try {
			await rewriteEntries(tableName);
			// await addIndexColumn(tableName);
			const schema = await store.getTableSchema(tableName);
			const filterOptions = {}; //await getFiltersOptions(tableName, Object.keys(schema));
			console.log('Rewrite response:', { schema, filterOptions, table: tableName });
			return { schema, filterOptions, name: tableName, dataUrl: '' };
		} catch (e) {
			console.error(`Failed to rewrite entries for table ${tableName}:`, e);
			return undefined;
		}
	};

	/**
	 * Returns the common table schema for all tables (e.g. all columns that are present in all tables with the same type)
	 * @param onlyCheckFields Only check these fields
	 * @returns a list of common filter options
	 * @example
	 * const commonSchema = computeCombinedTableSchema(['family', 'mode', 'vectorization']);
	 * // commonFilterOptions = {
	 * // 	family: "string",
	 * // 	mode: "string",
	 * // 	vectorization: "string"
	 * //   fpr: "number"
	 * // }
	 *
	 **/
	const computeCombinedTableSchema = (
		onlyCheckFields: string[] | undefined = undefined
	): TableSchema => {
		const { tables } = get(dataStore);
		return Object.entries(tables).reduce((acc, [_, value], idx) => {
			if (idx === 0) {
				acc = value.schema;
				return acc;
			}

			Object.entries(acc).forEach(([key, val]) => {
				if (onlyCheckFields !== undefined && !onlyCheckFields.includes(key)) {
					return;
				}

				// Check if key exists in other table
				if (!value.schema[key]) {
					delete acc[key];
					return;
				}

				// Check if type matches
				if (val !== value.schema[key]) {
					delete acc[key];
					return;
				}
			});

			return acc;
		}, {} as TableSchema);
	};

	const loadTableReference = async (
		ref: ITableReference,
		shouldSetLoading = true,
		shouldCreateTable = true,
		shouldUpdateTableList = true
	) => {
		console.debug('Loading table reference:', ref);
		switch (ref.source) {
			case TableSource.BUILD_IN: {
				const csvUrl = new URL(ref.url, location.href).href;
				return loadCsvFromUrl(
					csvUrl,
					ref.tableName,
					shouldSetLoading,
					shouldCreateTable,
					shouldUpdateTableList
				);
			}
			case TableSource.URL: {
				const csvUrl = ref.url;
				return loadCsvFromUrl(
					csvUrl,
					ref.tableName,
					shouldSetLoading,
					shouldCreateTable,
					shouldUpdateTableList
				);
			}
			case TableSource.FILE: {
				const csvUrl = ref.file;
				throw new Error('Not implemented yet');
				break;
			}
		}
	};

	/**
	 * Loads all CSVs for the selected filters entries
	 * @param selected
	 * @returns
	 */
	const loadTableReferences = async (refs: ITableReference[]) =>
		withLoading(async () => {
			if (refs.length === 0) {
				return;
			}

			console.debug('Loading table references:', refs);

			// Group tables by name for later processing
			const grouped = refs.reduce((acc, ref) => {
				if (!acc[ref.tableName]) {
					acc[ref.tableName] = [];
				}
				acc[ref.tableName].push(ref);
				return acc;
			}, {} as Record<string, ITableReference[]>);

			console.debug('Grouped table references:', grouped);

			// Check if references are already loaded
			// FIXME: for not assume we are reloading same samples and skip
			// TODO: add check or te databases
			if (Object.keys(grouped).every((tableName) => !!get(dataStore).tables[tableName])) {
				console.log('All tables are already loaded, skipping');
				return;
			}

			// Load multiple tables at once but all linked to the same tableName sequentially
			// This is required since we need to rewrite the entries for each table
			// and a table should only be created once
			const promise = Promise.all(
				Object.entries(grouped).flatMap(async ([tableName, entries]) => {
					if (entries.length === 0) {
						return [];
					}

					const loadedTables: ITableEntry[] = [];

					// Load grouped entries sequentially
					for (const [i, entry] of entries.entries()) {
						// Only create table for first entry
						// do not update store table list, this will be done after post processing
						const loadedTable = await loadTableReference(entry, false, i === 0, false);
						if (loadedTable) {
							loadedTables.push(loadedTable);
						}
					}

					// Post process tables
					return postProcessTable(tableName);
				})
			);

			// Compute combined schemas and other meta information
			try {
				// Filter out undefined values
				const promiseResult = await promise;
				const tableDefinitions = promiseResult.filter(
					(t) => t !== undefined
				) as unknown as ITableEntry[];
				console.log('Loaded tables:', { tableDefinitions, promiseResult });
				// Update data store
				dataStore.update((store) => {
					tableDefinitions.forEach((table) => {
						store.tables[table.name] = table;
					});
					store.combinedSchema = computeCombinedTableSchema();
					return store;
				});

				return tableDefinitions;
			} catch (e) {
				console.error('Failed to load CSVs:', e);
			}
		});

	const resetDatabase = async () => {
		const { sharedConnection: conn } = get(dataStore);

		if (!conn) {
			return;
		}

		// Drop all tables from duckdb
		const tables = await store.getTables();
		console.log('Dropping tables:', tables);
		const dropTablesQuery = tables.map((table) => `DROP TABLE "${table}";`).join('\n');

		try {
			await store.executeQuery(dropTablesQuery);
		} catch (e) {
			console.error(e);
		}

		// since we are unsure what tables are in the database, we need to reset the meta information here
		dataStore.update((store) => {
			store.tables = {};
			return store;
		});
	};

	const removeTable = async (tableName: string) => {
		const { sharedConnection: conn } = get(dataStore);

		if (!conn) {
			return;
		}

		const tables = await store.getTables();
		const table = tables.find((t) => t === tableName);
		if (!table) {
			return;
		}

		try {
			await store.executeQuery(`DROP TABLE "${tableName}"`);
			store.update((state) => {
				delete state.tables[tableName];
				return state;
			});
			computeCombinedTableSchema();
		} catch (e) {
			notificationStore.error({
				message: `Could not delete table ${tableName}`
			});
		}
	};

	// Export public API

	return {
		// Add modifiers
		loadEntriesFromFileList: async (fileList: FileList) => {
			const promises: Promise<void>[] = [];

			for (const file of fileList) {
				const tableName = file.name.replace('.csv', '');
				promises.push(loadCsvFromFile(file, tableName));
			}

			await Promise.all(promises);
		},
		loadCsvFromFile,
		loadCsvFromUrl,
		loadTableReferences,
		resetDatabase,
		removeTable
	};
};
