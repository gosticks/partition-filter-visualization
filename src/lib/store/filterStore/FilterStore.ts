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
	type ITableExternalFile,
	type ITableReference
} from './types';
import { PlaneGraphOptions } from './graphs/plane';
import { defaultLogOptions, withLogMiddleware } from '../logMiddleware';
import notificationStore from '../notificationStore';
import type { Dataset, DatasetItem } from '../../../dataset/types';

type UrlTableSelection = {
	source: TableSource;
	tableName: string;
	datasetName?: string; // Only set for source == build_in
};

const initialStore: IFilterStore = {
	isLoading: true,
	preloadedDatasets: [],
	selectedTables: []
};

// Hacky way to create a new store with a new base object
const baseStore = writable<IFilterStore>(JSON.parse(JSON.stringify(initialStore)));

const storeEncodeSelectedTables = (tables: IFilterStore['selectedTables']) =>
	tables.map(
		(el) =>
			({
				source: el.source,
				tableName: el.tableName,
				datasetName: el.source == TableSource.BUILD_IN ? el.dataset.name : undefined
			} as UrlTableSelection)
	);

const _filterStore = () => {
	const urlEncoder: UrlEncoder = (key, type, value) => {
		if (key === 'graphOptions') {
			console.log('Encoding graph options', value);
			if (!value) {
				return undefined;
			}
			return (value as GraphOptions).getType();
		}

		if (key === 'selectedTables') {
			const val = value as ITableReference[];

			return defaultUrlEncoder(key, type, storeEncodeSelectedTables(val));
		}

		const encodedValue = defaultUrlEncoder(key, type, value);
		// console.log('Encoding', key, encodedValue, value, JSON.stringify(value));
		return encodedValue;
	};

	// Store renderer temporarily globally and
	// Set it after database init was completed
	let urlRestoredGraphOptions: GraphOptions | null = null;
	let urlRestoredTableSelection: UrlTableSelection[] = [];
	const urlDecoder: UrlDecoder = (key, type, value) => {
		switch (key) {
			case 'graphOptions': {
				const graphType = value as GraphType;
				switch (graphType) {
					case GraphType.PLANE: {
						urlRestoredGraphOptions = new PlaneGraphOptions();
						return undefined;
					}
				}
				break;
			}
			case 'selectedTables': {
				urlRestoredTableSelection = defaultUrlDecoder(key, type, value) as UrlTableSelection[];

				return [];
			}
		}

		return defaultUrlDecoder(key, type, value);
	};

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

	const reloadCurrentGraph = async () => {
		// reload state with table changes
		const state = get(store);
		if (state.graphOptions) {
			state.graphOptions.reloadFilterOptions();
			await state.graphOptions.applyOptionsIfValid();
		}
	};

	const selectBuildInTables = async (dataset: Dataset, tablePaths: DatasetItem[]) => {
		// Convert filter options to table references
		const tableReferences: ITableBuildIn[] = tablePaths.flatMap((item) => {
			return item.files.map((file) => ({
				tableName: item.name,
				displayName: file.name,
				source: TableSource.BUILD_IN,
				// FIXME: create correct path on server
				url: '/' + file.dataURL,
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

		toStateObject: () => {
			const state = get(store);

			return {
				selectedTables: storeEncodeSelectedTables(state.selectedTables),
				graphOptions: state.graphOptions?.toStateObject()
			};
		},

		reset: () => {
			dataStore.resetDatabase();

			const newInitialState = JSON.parse(JSON.stringify(initialStore));
			newInitialState.preloadedDatasets = get(store).preloadedDatasets;
			newInitialState.isLoading = false;
			set(newInitialState);
		},

		// Actions

		// initWithPreloadedDatasets:
		// called after frontend completed mount of graph component and server defined Datasets are available to the client
		// This is the perfect spot for restoring state since initial server and client states are available
		initWithPreloadedDatasets: async (datasets: Dataset[], selectedGraph?: any) => {
			update((store) => {
				store.preloadedDatasets = datasets;
				return store;
			});

			// restore selected tables not that we have the paths from the server
			const restoredSelectedTables: [Dataset, DatasetItem][] = [];

			// FIXME: cleanup & and handle edge cases
			if (selectedGraph) {
				console.log('using selected Graph', selectedGraph);
				urlRestoredTableSelection = selectedGraph.selectedTables;

				if (selectedGraph['graphOptions']) {
					const graphType = selectedGraph.graphOptions.type as GraphType;
					switch (graphType) {
						case GraphType.PLANE: {
							urlRestoredGraphOptions = new PlaneGraphOptions(selectedGraph.graphOptions.state);
						}
					}
				}
			}

			urlRestoredTableSelection.forEach((selection) => {
				switch (selection.source) {
					case TableSource.BUILD_IN: {
						const dataset = datasets.find((dataset) => dataset.name == selection.datasetName);
						if (dataset) {
							const datasetItem = dataset.items.find((item) => item.name == selection.tableName);
							if (datasetItem) {
								console.log(datasetItem);
								restoredSelectedTables.push([dataset, datasetItem]);
							}
						}
						break;
					}
					case TableSource.URL:
						console.warn('restore from URL not supported yet');
						break;
					case TableSource.FILE:
						console.warn('restore from FILE not supported yet');
						break;
				}
			});
			// remove temporary url values
			urlRestoredTableSelection = [];
			// load all tables
			for (const [dataset, item] of restoredSelectedTables) {
				await selectBuildInTables(dataset, [item]);
			}

			// Attempt reloading selected tables
			if (get(store).selectedTables.length !== 0) {
				try {
					if (urlRestoredGraphOptions && urlRestoredGraphOptions !== null) {
						update((store) => {
							store.graphOptions = urlRestoredGraphOptions ?? undefined;
							return store;
						});
						await reloadCurrentGraph();
					}
				} catch (e) {
					console.error('Failed to load selected tables:', e);
				}
			}
			// remove temporary url values
			urlRestoredGraphOptions = null;

			setIsLoading(false);
			return;
		},
		selectBuildInTables,
		selectDataset: (dataset?: Dataset) => {
			update((state) => {
				state.selectedDataset = dataset;
				return state;
			});
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
