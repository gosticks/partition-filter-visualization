import { get, writable } from 'svelte/store';
import { dataStore } from '../dataStore/DataStore';
import {
	withUrlStorage,
	type UrlEncoder,
	defaultUrlEncoder,
	type UrlDecoder,
	defaultUrlDecoder
} from '../urlStorage';
import {
	type IFilterStore,
	TableSource,
	GraphOptions,
	GraphType,
	type ITableRefList,
	type ITableBuildIn,
	type ITableExternalUrl,
	type ITableExternalFile
} from './types';
import { PlaneGraphOptions } from './graphs/plane';
import { defaultLogOptions, withLogMiddleware } from '../logMiddleware';
import notificationStore from '../notificationStore';
import type { Dataset, DatasetItem } from '../../../dataset/types';

export interface IFilterStoreGraphOptions {
	type: GraphType.PLANE;
	options: {
		x: string;
		y: string;
		z: string;
		mode: string;
		axisRanges?: Partial<{
			x: [number, number];
			y: [number, number];
			z: [number, number];
		}>;
	};
}

const initialStore: IFilterStore = {
	isLoading: true,
	preloadedDatasets: [],
	selectedTables: []
};

const urlEncoder: UrlEncoder = (key, type, value) => {
	if (key === 'graphOptions') {
		console.log('Encoding graph options', value);
		if (!value) {
			return undefined;
		}
		return (value as GraphOptions).getType();
	}

	if (key === 'selectedTables') {
		console.error('ENCODING BROKEN');
		return;
	}

	const encodedValue = defaultUrlEncoder(key, type, value);
	// console.log('Encoding', key, encodedValue, value, JSON.stringify(value));
	return encodedValue;
};

// Store renderer temporarily globally and
// Set it after database init was completed

let _graphOptions: GraphOptions | null = null;

const urlDecoder: UrlDecoder = (key, type, value) => {
	switch (key) {
		case 'graphOptions': {
			const graphType = value as GraphType;
			switch (graphType) {
				case GraphType.PLANE: {
					_graphOptions = new PlaneGraphOptions();
					return undefined;
				}
			}
			break;
		}
		case 'selectedTables': {
			console.error('ENCODING BROKEN');
			return;
		}
	}

	return defaultUrlDecoder(key, type, value);
};

// Hacky way to create a new store with a new base object
const baseStore = writable<IFilterStore>(JSON.parse(JSON.stringify(initialStore)));

const _filterStore = () => {
	console.log('### INIT STORE ###', get(baseStore));
	const store = withLogMiddleware(
		withUrlStorage(
			baseStore,
			{
				selectedTables: 'object',
				graphOptions: 'object'
			},
			urlEncoder,
			urlDecoder
		),
		'FilterStore',
		{ ...defaultLogOptions, color: 'green' }
	);

	const { set, update, subscribe } = store;

	const setIsLoading = (isLoading: boolean) => {
		update((store) => {
			store.isLoading = isLoading;
			return store;
		});
	};

	const selectTables = async (tables: ITableRefList) => {
		setIsLoading(true);
		// Load tables into data store
		try {
			const loadedTables = await dataStore.loadCsvsFromRefs(tables);
			store.update((store) => {
				store.selectedTables = [...store.selectedTables, ...tables];
				return store;
			});
		} catch (e) {
			console.error('Failed to load tables:', e);
			return;
		} finally {
			setIsLoading(false);
		}
	};

	const reloadCurrentGraph = () => {
		// reload state with table changes
		const state = get(store);
		if (state.graphOptions) {
			state.graphOptions.reloadFilterOptions();
			state.graphOptions.applyOptionsIfValid();
		}
	};

	return {
		set,
		update,
		subscribe,
		selectTables,

		removeTable: async (tableName: string) => {
			try {
				await dataStore.removeTable(tableName);
				await reloadCurrentGraph();
			} catch {
				notificationStore.error({
					message: `Failed to remove table "${tableName}"`
				});
			}
		},

		reset: () => {
			dataStore.resetDatabase();

			const newInitialState = JSON.parse(JSON.stringify(initialStore));
			newInitialState.preloadedDatasets = get(store).preloadedDatasets;
			newInitialState.isLoading = false;
			set(newInitialState);
		},

		// Actions
		initWithPreloadedDatasets: async (datasets: Dataset[]) => {
			console.log('Loading datasets', datasets);
			// FIXME: enable after refactor
			update((store) => {
				store.preloadedDatasets = datasets;
				return store;
			});

			// Attempt reloading selected tables
			const { selectedTables } = get(store);
			if (selectedTables.length !== 0) {
				// group tables by ref type
				const buildInTables = selectedTables.filter(
					(t) => t.source === TableSource.BUILD_IN
				) as ITableBuildIn[];
				const fileTables = selectedTables.filter(
					(t) => t.source === TableSource.FILE
				) as ITableExternalFile[];
				const urlTables = selectedTables.filter(
					(t) => t.source === TableSource.URL
				) as ITableExternalUrl[];

				try {
					if (buildInTables.length !== 0) {
						await selectTables(buildInTables);
					}
					if (urlDecoder.length !== 0) {
						await selectTables(urlTables);
					}
					if (fileTables.length !== 0) {
						alert('TODO: request user to reupload tables');
						// await selectTables(fileTables);
					}

					if (_graphOptions && _graphOptions !== null) {
						update((store) => {
							store.graphOptions = _graphOptions ?? undefined;
							return store;
						});
						await reloadCurrentGraph();
					}
				} catch (e) {
					console.error('Failed to load selected tables:', e);
				}
			}

			setIsLoading(false);
			return;
		},

		selectDataset: (dataset?: Dataset) => {
			update((state) => {
				state.selectedDataset = dataset;
				return state;
			});
		},

		selectBuildInTables: async (dataset: Dataset, tablePaths: DatasetItem[]) => {
			if (dataset !== get(store).selectedDataset) {
				// selected dataset and tables to be loaded do
				// not match
				return;
			}

			// Convert filter options to table references
			const tableReferences: ITableBuildIn[] = tablePaths.flatMap((item) => {
				return item.files.map((file) => ({
					tableName: item.name,
					displayName: file.name,
					source: TableSource.BUILD_IN,
					url: file.dataURL,
					dataset
				}));
			});

			try {
				await selectTables(tableReferences);
				await reloadCurrentGraph();
				return;
			} catch {
				notificationStore.error({
					message: 'Failed to load external tables',
					description: tablePaths.map((table) => table.name).join(',')
				});
			}
		},

		selectTableFromURL: async (url: URL) => {
			// Convert filter options to table references
			const tableReferences: ITableExternalUrl[] = [
				{
					tableName: url.pathname.replaceAll('/', '-'),
					source: TableSource.URL,
					url: url.href
				}
			];
			try {
				await selectTables(tableReferences);
				await reloadCurrentGraph();
				return;
			} catch (err) {
				notificationStore.error({
					message: 'Failed to load tables from file',
					description: `${tableReferences.map((table) => table.tableName).join(',')}, err=${
						err ?? 'Unknown Error'
					}`
				});
			}
		},

		selectTablesFromFiles: async (fileList: FileList) => {
			// Convert filter options to table references
			const tableReferences: ITableExternalFile[] = [];

			for (const file of fileList) {
				tableReferences.push({
					tableName: file.name,
					source: TableSource.FILE,
					file
				});
			}

			try {
				await selectTables(tableReferences);
				await reloadCurrentGraph();
				return;
			} catch (err) {
				notificationStore.error({
					message: 'Failed to load tables from file',
					description: `${tableReferences.map((table) => table.tableName).join(',')}, err=${
						err ?? 'Unknown Error'
					}`
				});
			}
		},

		selectGraphType: async (graphType: GraphType) => {
			switch (graphType) {
				case GraphType.PLANE: {
					update((store) => {
						store.graphOptions = new PlaneGraphOptions();
						return store;
					});
				}
			}
		}
	};
};

export default _filterStore();
