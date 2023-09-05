import { get, type Writable } from 'svelte/store';
import type { FilterEntry } from '$routes/graph/+page.server';
import type { BaseStoreType } from './DataStore';
import type { FilterOptions, IDataStore, ITableEntry, TableSchema } from './types';
import { DuckDBDataProtocol } from '@duckdb/duckdb-wasm';
import { TableSource, type ITableReference } from '../FilterStore';
import type { I } from 'vitest/dist/types-71ccd11d';

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

	const loadCsvFromUrl = async (
		path: string,
		tableName: string,
		shouldSetLoading = true,
		createTable = true
	) => {
		const { sharedConnection: conn } = get(dataStore);

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

	const loadTableReference = async (
		ref: ITableReference,
		shouldSetLoading = true,
		shouldCreateTable = true
	) => {
		switch (ref.source) {
			case TableSource.BUILD_IN: {
				const csvUrl = new URL(ref.url, location.href).href;
				return loadCsvFromUrl(csvUrl, ref.tableName, shouldSetLoading, shouldCreateTable);
			}
			case TableSource.URL: {
				const csvUrl = ref.url;
				return loadCsvFromUrl(csvUrl, ref.tableName, shouldSetLoading, shouldCreateTable);
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

			// Group tables by name for later processing
			const grouped = refs.reduce((acc, ref) => {
				if (!acc[ref.tableName]) {
					acc[ref.tableName] = [];
				}
				acc[ref.tableName].push(ref);
				return acc;
			}, {} as Record<string, ITableReference[]>);

			// Check if references are already loaded
			// TODO: add check or delete databases

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
						const loadedTable = await loadTableReference(entry, false, i === 0);
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
				const tableDefinitions = (await promise).filter(
					(t) => t !== undefined
				) as unknown as ITableEntry[];

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
				dataStore.update((store) => {
					store.tables = {};
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
		loadTableReferences,
		resetDatabase
	};
};
