import { get, type Writable } from 'svelte/store';
import notificationStore from '../notificationStore';
import type { BaseStoreType } from './DataStore';
import { dataStorePostProcessingExtension } from './postProcessing';
import type { IDataStore, ILoadedTable, ITableExternalFile, TableSchema } from './types';
import { TableSource, type ITableReference, type ITableRefList } from './types';

// Store extension containing actions to load data, transform & drop data
export const dataStoreLoadExtension = (store: BaseStoreType, dataStore: Writable<IDataStore>) => {
	const postProcessingExtension = dataStorePostProcessingExtension(store, dataStore);

	// Wrapper utility to set loading state
	const withLoading = async <T>(fn: () => Promise<T>) => {
		store.setIsLoading(true);
		try {
			return await fn();
		} finally {
			store.setIsLoading(false);
		}
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

	const getTableDisplayName = (rawTableName: string) => {
		// NOTE: inefficient string replacement with multiple loops, deemed acceptable due to
		// low call frequency. At most once per table creation.
		return rawTableName.replaceAll('_', ' ').replaceAll('-', ' ').trim();
	};

	const loadCsvFromRef = async (
		ref: ITableReference,
		shouldSetLoading = true,
		createTable = true
	): Promise<ITableReference | undefined> => {
		const conn = await store.getConnection();

		if (!conn) {
			throw new Error('no database connection');
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

			return ref;
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
				acc = JSON.parse(JSON.stringify(value.schema));
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
	 * group table references by their table name
	 */
	const groupTableReferences = (refs: ITableReference[]): Record<string, ITableRefList> =>
		refs.reduce(
			(acc, ref) => {
				if (!acc[ref.tableName]) {
					acc[ref.tableName] = [];
				}
				// type
				acc[ref.tableName].push(ref as any);
				return acc;
			},
			{} as Record<string, ITableRefList>
		);

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
			const grouped = groupTableReferences(refs);
			console.debug('Grouped table references:', grouped);

			// Load multiple tables at once, with all references for one table loaded in sequentially
			// Otherwise parts of one table would be loaded and processed incorrectly
			const promise = Promise.all(
				Object.entries(grouped).flatMap(async ([tableName, entries]) => {
					if (entries.length === 0) {
						return undefined;
					}

					console.debug('loading table group:', { tableName, entries });
					// Load grouped entries sequentially
					for (const [i, entry] of entries.entries()) {
						// Only create table for first entry
						// do not update store table list, this will be done after post processing
						await loadCsvFromRef(entry, false, i === 0);
						console.debug('loaded:', { tableName, entry });
					}

					const sourceSchema = await store.getTableSchema(tableName);

					const loadedTableInfo: ILoadedTable = {
						tableName: tableName, // when no transformations were applied use the default table
						displayName: getTableDisplayName(tableName),
						sourceTableName: tableName,
						sourceSchema,
						transformations: [],
						schema: sourceSchema,
						filterOptions: {},
						refs: entries
					};

					// Post process tables
					await postProcessingExtension.applyPostProcessing(loadedTableInfo);

					return loadedTableInfo;
				})
			);

			// Compute combined schemas and other meta information
			try {
				// Filter out undefined values
				const promiseResult = await promise;
				const tableDefinitions = promiseResult.filter((t) => t !== undefined) as ILoadedTable[];
				console.debug('loaded tables into db:', { tableDefinitions, promiseResult });
				// Update data store
				dataStore.update((store) => {
					tableDefinitions.forEach((table) => {
						store.tables[table.sourceTableName] = table;
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
		...postProcessingExtension,
		// Add modifiers
		loadEntriesFromFileList: async (fileList: FileList) => {
			// TODO: handle non CSV files

			let refs: ITableExternalFile[] = [];

			for (const file of fileList) {
				refs.push({
					source: TableSource.FILE,
					file,
					tableName: file.name.replace('.csv', '')
				});
			}

			await loadCsvsFromRefs(refs);
		},
		loadCsvsFromRefs,
		resetDatabase,
		removeTable
	};
};
