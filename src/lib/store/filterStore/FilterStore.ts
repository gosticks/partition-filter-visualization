import { get, writable } from 'svelte/store';
import { dataStore } from '../dataStore/DataStore';
import { withSingleKeyUrlStorage } from '../urlStorage';
import { type IFilterStore, GraphOptions, GraphType, type GraphStateConfig } from './types';
import { PlaneGraphModel } from './graphs/plane';
import { defaultLogOptions, withLogMiddleware } from '../logMiddleware';
import notificationStore from '../notificationStore';
import type { Dataset, DatasetItem } from '../../../dataset/types';
import { browser } from '$app/environment';
import {
	TableSource,
	type ITableExternalUrl,
	type ITableExternalFile,
	type ITableBuildIn
} from '../dataStore/types';
import { toStateObject, urlEncodeFilterState } from './restore';

const initialStore: IFilterStore = {
	isLoading: true,
	preloadedDatasets: []
};

// Hacky way to create a new store with a new base object
const baseStore = writable<IFilterStore>(JSON.parse(JSON.stringify(initialStore)));

const _filterStore = () => {
	// Store renderer temporarily globally and
	// Set it after database init was completed
	let urlRestoredGraphOptions: GraphOptions | null = null;
	// let urlRestoredTableSelection: UrlTableSelection[] = [];
	const store = withLogMiddleware(
		withSingleKeyUrlStorage<IFilterStore>(
			baseStore,
			'filter',
			urlEncodeFilterState,
			() => initialStore
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

	const reloadCurrentGraph = async () => {
		// reload state with table changes
		const state = get(store);
		if (state.graphOptions) {
			state.graphOptions.reloadFilterOptions();
			await state.graphOptions.applyOptionsIfValid();
		}
	};

	if (browser) {
		// update filters every time data store changes
		// dataStore.subscribe((state) => {
		// 	reloadCurrentGraph();
		// });
	}

	const loadBuildInTables = async (dataset: Dataset, tablePaths: DatasetItem[]) => {
		// Convert filter options to table references
		const tableReferences: ITableBuildIn[] = tablePaths.flatMap((item) => {
			return item.files.map((file) => ({
				tableName: item.name,
				displayName: file.name,
				source: TableSource.BUILD_IN,
				// FIXME: create correct path on server
				url: '/' + file.dataURL,
				datasetName: dataset.name
			}));
		});

		try {
			await dataStore.loadCsvsFromRefs(tableReferences);
			return;
		} catch {
			notificationStore.error({
				message: 'Failed to load external tables',
				description: tablePaths.map((table) => table.name).join(',')
			});
		}
	};

	const loadTableFromURL = async (url: URL, tableName?: string) => {
		// Convert filter options to table references
		const tableReferences: ITableExternalUrl[] = [
			{
				tableName: tableName ?? url.pathname.replaceAll('/', '-'),
				source: TableSource.URL,
				url: url.href
			}
		];
		try {
			await dataStore.loadCsvsFromRefs(tableReferences);
			return;
		} catch (err) {
			notificationStore.error({
				message: 'Failed to load tables from file',
				description: `${tableReferences.map((table) => table.tableName).join(',')}, err=${
					err ?? 'Unknown Error'
				}`
			});
		}
	};

	const loadTablesFromFiles = async (fileList: FileList, tableName?: string) => {
		// Convert filter options to table references
		const tableReferences: ITableExternalFile[] = [];

		for (const file of fileList) {
			tableReferences.push({
				tableName: tableName ?? file.name,
				source: TableSource.FILE,
				file
			});
		}

		try {
			await dataStore.loadCsvsFromRefs(tableReferences);
			return;
		} catch (err) {
			notificationStore.error({
				message: 'Failed to load tables from file',
				description: `${tableReferences.map((table) => table.tableName).join(',')}, err=${
					err ?? 'Unknown Error'
				}`
			});
		}
	};

	const initWithConfig = async (config: GraphStateConfig) => {
		const datasets = get(store).preloadedDatasets;
		console.debug('init from config ', { config, datasets });
		for (const table of config.selectedTables) {
			let loadedDatasets: Record<string, DatasetItem[]> = {};
			for (const ref of table.refs) {
				switch (ref.source) {
					case TableSource.BUILD_IN: {
						const dataset = datasets.find((dataset) => dataset.name == ref.datasetName);
						if (dataset) {
							if (!loadedDatasets[dataset.name]) {
								loadedDatasets[dataset.name] = [];
							}

							const datasetItem = dataset.items.find((item) => item.name == table.tableName);
							if (datasetItem) {
								loadedDatasets[dataset.name] = [...loadedDatasets[dataset.name], datasetItem];
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
			}

			for (const [datasetName, items] of Object.entries(loadedDatasets)) {
				await loadBuildInTables(datasets.find((dataset) => dataset.name === datasetName)!, items);
			}
		}

		if (config.graphOption) {
			switch (config.graphOption.type) {
				case GraphType.PLANE: {
					store.update((state) => {
						state.graphOptions = new PlaneGraphModel(
							config.graphOption?.data,
							config.graphOption?.renderer
						);
						return state;
					});
				}
			}
		}
	};

	return {
		set,
		update,
		subscribe,

		// Util methods for loading collection of tables and handling reloads
		loadBuildInTables,
		loadTableFromURL,
		loadTablesFromFiles,

		removeTable: async (tableName: string) => {
			try {
				await dataStore.removeTable(tableName);
			} catch {
				notificationStore.error({
					message: `Failed to remove table "${tableName}"`
				});
			}
			await reloadCurrentGraph();
		},

		toStateObject: () => {
			const state = get(store);
			return toStateObject(state);
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
		initWithPreloadedDatasets: async (datasets: Dataset[], config?: GraphStateConfig) => {
			update((store) => {
				store.preloadedDatasets = datasets;
				return store;
			});

			// if we have a config it takes precedence over URL decoding
			if (config) {
				await initWithConfig(config);
			}
			await reloadCurrentGraph();
			// // restore selected tables not that we have the paths from the server
			// const restoredSelectedTables: [Dataset, DatasetItem][] = [];

			// // FIXME: cleanup & and handle edge cases
			// if (selectedGraph) {
			// 	console.log('using selected Graph', selectedGraph);
			// 	urlRestoredTableSelection = selectedGraph.selectedTables;

			// 	if (selectedGraph['graphOptions']) {
			// 		const graphType = selectedGraph.graphOptions.type as GraphType;
			// 		switch (graphType) {
			// 			case GraphType.PLANE: {
			// 				urlRestoredGraphOptions = new PlaneGraphModel(selectedGraph.graphOptions.state);
			// 			}
			// 		}
			// 	}
			// }

			// urlRestoredTableSelection.forEach((selection) => {
			// 	switch (selection.source) {
			// 		case TableSource.BUILD_IN: {
			// 			const dataset = datasets.find((dataset) => dataset.name == selection.datasetName);
			// 			if (dataset) {
			// 				const datasetItem = dataset.items.find((item) => item.name == selection.tableName);
			// 				if (datasetItem) {
			// 					console.log(datasetItem);
			// 					restoredSelectedTables.push([dataset, datasetItem]);
			// 				}
			// 			}
			// 			break;
			// 		}
			// 		case TableSource.URL:
			// 			console.warn('restore from URL not supported yet');
			// 			break;
			// 		case TableSource.FILE:
			// 			console.warn('restore from FILE not supported yet');
			// 			break;
			// 	}
			// });
			// // remove temporary url values
			// urlRestoredTableSelection = [];
			// // load all tables
			// for (const [dataset, item] of restoredSelectedTables) {
			// 	await dataStore.loadBuildInTables(dataset, [item]);
			// }

			// // Attempt reloading selected tables
			// if (get(dataStore).tables.length) {
			// 	try {
			// 		if (urlRestoredGraphOptions && urlRestoredGraphOptions !== null) {
			// 			update((store) => {
			// 				store.graphOptions = urlRestoredGraphOptions ?? undefined;
			// 				return store;
			// 			});
			// 			await reloadCurrentGraph();
			// 		}
			// 	} catch (e) {
			// 		console.error('Failed to load selected tables:', e);
			// 	}
			// }
			// // remove temporary url values
			// urlRestoredGraphOptions = null;

			setIsLoading(false);
			return;
		},

		selectGraphType: async (graphType: GraphType) => {
			switch (graphType) {
				case GraphType.PLANE: {
					update((store) => {
						const state = store.graphOptions?.toStateObject();
						store.graphOptions = new PlaneGraphModel(state?.data, state?.render);
						return store;
					});
				}
			}
		}
	};
};

export default _filterStore();
