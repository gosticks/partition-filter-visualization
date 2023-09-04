import { get, type Writable } from 'svelte/store';
import type { FilterEntry } from '$routes/graph/+page.server';
import type { BaseStoreType } from './DataStore';
import type { FilterOptions, IDataStore, ITableEntry, TableSchema } from './types';
import type { DuckDBDataProtocol } from '@duckdb/duckdb-wasm';

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
			const { db, sharedConnection: conn } = get(dataStore);

			if (!db || !conn) {
				return;
			}

			store.setIsLoading(true);

			try {
				await db.registerFileHandle(tableName, file, DuckDBDataProtocol.BROWSER_FILEREADER, true);
				console.log('Registered file handle:', tableName);
			} catch (e) {
				console.error(`Failed to load table ${tableName} from file ${file.name}:`, e);
				throw e;
			} finally {
				store.setIsLoading(false);
			}
		});

	const loadCsvFromUrl = async (path: string, tableName: string, shouldSetLoading = true) => {
		const { tables, sharedConnection: conn } = get(dataStore);

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
				create: tables[tableName] === undefined
			});

			const schema = await store.getTableSchema(tableName);
			// const filterOptions = await getFiltersOptions(tableName, Object.keys(schema), conn);
			const tableEntry: ITableEntry = {
				name: tableName,
				dataUrl: path,
				schema,
				filterOptions: {}
			};

			// Update or replace table entry
			dataStore.update((store) => {
				store.tables[tableName] = tableEntry;
				return store;
			});

			return tableEntry;
		} catch (e) {
			console.error(`Failed to load table ${tableName} at ${path}:`, e);
			throw e;
		} finally {
			if (shouldSetLoading) {
				store.setIsLoading(false);
			}
		}
	};

	const postProcessTable = async (tableName: string) => {
		try {
			await rewriteEntries(tableName);
			await addIndexColumn(tableName);
			const schema = await store.getTableSchema(tableName);
			const filterOptions = {}; //await getFiltersOptions(tableName, Object.keys(schema));
			console.log('Rewrite response:', { schema, filterOptions, table: tableName });
			return { schema, filterOptions, table: tableName };
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
		console.log('Tables:', tables);
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

	/**
	 * Loads all CSVs for the selected filters entries
	 * @param selected
	 * @returns
	 */
	const loadEntries = async (selected: FilterEntry[]) =>
		withLoading(async () => {
			if (selected.length === 0) {
				return;
			}

			// Check if we already have loaded the table
			selected = selected.filter((filter) => {
				const { tables } = get(dataStore);
				return tables[filter.name] === undefined;
			});

			const promise = Promise.all(
				selected.flatMap((filter) => {
					if (filter.entries.length > 0) {
						const entry = filter.entries[0];
						const csvUrl = new URL(entry.dataUrl, location.href).href;
						// Do not set loading flag since we handle it here
						return loadCsvFromUrl(csvUrl, filter.name, false);
					}
					// FIXME: enable after testing
					// filter.entries.map((entry) => {
					// 	const csvUrl = new URL(entry.dataUrl, location.href).href;
					// 	console.log({ csvUrl, filter, entry });
					// 	return loadCSV(csvUrl, filter.name);
					// })
					// )
				})
			);

			try {
				const tableDefinitions = await promise;

				const { tables } = get(dataStore);

				// Rewrite entries & update schemas
				const rewriteResponses = await Promise.all(Object.keys(tables).map(postProcessTable));

				console.log('Rewrite responses:', rewriteResponses);

				dataStore.update((store) => {
					rewriteResponses.forEach((resp) => {
						if (!resp) {
							return;
						}
						store.tables[resp.table].schema = resp.schema;
						store.tables[resp.table].filterOptions = resp.filterOptions;
					});
					store.combinedSchema = computeCombinedTableSchema();
					return store;
				});

				// Store preloaded table in query params
				const params = new URLSearchParams(location.search);
				tableDefinitions.forEach((table) => {
					if (!table) {
						return;
					}
					params.set('table', table.name);
				});

				history.replaceState(null, '', `?${params.toString()}`);

				return tableDefinitions;
			} catch (e) {
				console.error('Failed to load CSVs:', e);
				dataStore.update((store) => {
					store.tables = {};
					store.commonFilterOptions = {};
					return store;
				});
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
		loadEntries,
		resetDatabase
	};
};
