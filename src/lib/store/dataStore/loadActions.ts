import { get, type Writable } from 'svelte/store';
import type { BaseStoreType } from './DataStore';
import type { IDataStore, ILoadedTable, ITableBuildIn,  TableSchema } from './types';
import {
	TableSource,
	type ITableReference,
	type ITableRefList,
} from './types';
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

	const rewriteExperimentsEntries = async (tableName: string) => {
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

	const bindFileToDuckDB = async (dbPath: string, file: File) => {
		const { db } = get(dataStore);
		const conn = await store.getConnection();
		if (!db || !conn) {
			return;
		}

		// Must be imported client side since WASM package breaks SvelteKit server SSR at build time
		const { DuckDBDataProtocol } = await import('@duckdb/duckdb-wasm');

		await db.registerFileHandle(dbPath, file, DuckDBDataProtocol.BROWSER_FILEREADER, true);
	};

	const loadCsvFromRef = async (
		ref: ITableReference,
		shouldSetLoading = true,
		createTable = true,
		shouldUpdateTableList = true
	): Promise<ILoadedTable | undefined> => {
		const conn = await store.getConnection();

		if (!conn) {
			throw new Error("no database connection")
		}

		if (shouldSetLoading) {
			store.setIsLoading(true);
		}

		let url = '';
		try {
			switch (ref.source) {
				case TableSource.BUILD_IN:
					url = new URL(ref.url, location.href).href;
					break;
				case TableSource.FILE:
					await bindFileToDuckDB(ref.file.name, ref.file);
					url = ref.file.name;
					break;
				case TableSource.URL:
					url = ref.url;
					break;
			}

			if (createTable) {
				// remove old table with this name
				await removeTable(ref.tableName);
			}

			await conn.insertCSVFromPath(url, {
				name: ref.tableName,
				detect: true,
				create: createTable
			});

			const schema = await store.getTableSchema(ref.tableName);
			const prevRefs = get(store).tables[ref.tableName]?.refs ?? [];
			const loadedTableInfo: ILoadedTable = {
				name: ref.tableName,
				displayName: ref.displayName,
				schema,
				filterOptions: {},
				refs: createTable ? [ref] : [...prevRefs, ref]
			};

			if (shouldUpdateTableList) {
				// Update or replace table entry
				dataStore.update((store) => {
					store.tables[ref.tableName] = loadedTableInfo
					return store;
				});
			}

			return loadedTableInfo;
		} catch (e) {
			const msg = `Failed to load table ${ref.tableName} from path ${url}`;
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

	const postProcessTable = async (
		tableName: string,
		refs: ITableRefList
	): Promise<ILoadedTable | undefined> => {
		console.debug('Post process', { tableName, refs });
		if (refs.length === 0) {
			return;
		}
		// get list type
		const refType = refs[0].source;
		try {
			switch (refType) {
				case TableSource.BUILD_IN: {
					// FIXME: handle table parsing
					// switch (refs[0].dataset.name) {
						// case 'experiments':
							await rewriteExperimentsEntries(tableName);
					// }
				}
			}
			// await addIndexColumn(tableName);
			const schema = await store.getTableSchema(tableName);
			const filterOptions = {}; //await getFiltersOptions(tableName, Object.keys(schema));
			console.log('Rewrite response:', { schema, filterOptions, table: tableName });
			return { schema, filterOptions, name: tableName, refs };
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


	/**
	 * Loads all CSVs for the selected filters entries
	 * @param selected
	 * @returns
	 */
	const loadCsvsFromRefs = async (refs: ITableReference[]): Promise<ILoadedTable[]> =>
		withLoading(async () => {
			if (refs.length === 0) {
				return [];
			}

			console.debug('Loading table references:', refs);

			// Group tables by name for later processing
			const grouped = refs.reduce((acc, ref) => {
				if (!acc[ref.tableName]) {
					acc[ref.tableName] = [];
				}
				// type
				acc[ref.tableName].push(ref as any);
				return acc;
			}, {} as Record<string, ITableRefList>);

			console.debug('Grouped table references:', grouped);

			// Load multiple tables at once but all linked to the same tableName sequentially
			// This is required since we need to rewrite the entries for each table
			// and a table should only be created once
			const promise = Promise.all(
				Object.entries(grouped).flatMap(async ([tableName, entries]) => {
					if (entries.length === 0) {
						return [];
					}

					const loadedTables: ILoadedTable[] = [];

					console.debug('loading table group:', { tableName, entries });
					// Load grouped entries sequentially
					for (const [i, entry] of entries.entries()) {
						// Only create table for first entry
						// do not update store table list, this will be done after post processing
						const loadedTable = await loadCsvFromRef(entry, false, i === 0, false);
						if (loadedTable) {
							loadedTables.push(loadedTable);
						}
						console.debug('loaded:', { tableName, entry });
					}
					console.debug('applying post processing:', { tableName, entries });

					// Post process tables
					return postProcessTable(tableName, entries) ?? [];
				})
			);

			// Compute combined schemas and other meta information
			try {
				// Filter out undefined values
				const promiseResult = await promise;
				const tableDefinitions = promiseResult.filter(
					(t) => t !== undefined
				) as unknown as ILoadedTable[];
				console.debug('loaded tables into db:', { tableDefinitions, promiseResult });
				// Update data store
				dataStore.update((store) => {
					tableDefinitions.forEach((table) => {
						store.tables[table.name] = table;
					});
					store.combinedSchema = computeCombinedTableSchema();
					return store;
				});
				console.debug('loaded tables', { tableDefinitions });
				return tableDefinitions;
			} catch (e) {
				console.error('Failed to load CSVs:', { e, refs });
				return [];
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
			const promises: Promise<ILoadedTable | undefined>[] = [];

			for (const file of fileList) {
				const tableName = file.name.replace('.csv', '');
				promises.push(
					loadCsvFromRef({
						source: TableSource.FILE,
						file: file,
						tableName: tableName
					})
				);
			}

			await Promise.all(promises);
		},
		loadCsvFromRef,
		loadCsvsFromRefs,
		resetDatabase,
		removeTable
	};
};
