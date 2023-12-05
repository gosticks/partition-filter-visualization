import { get, writable } from 'svelte/store';
import { dataStore } from '../dataStore/DataStore';
import { urlDecodeObject, withSingleKeyUrlStorage } from '../urlStorage';
import {
	type IFilterStore,
	GraphOptions,
	GraphType,
	type GraphStateConfig,
	type DeepPartial
} from './types';
import { PlaneGraphModel } from './graphs/plane';
import { defaultLogOptions, withLogMiddleware } from '../logMiddleware';
import notificationStore from '../notificationStore';
import type { Dataset, DatasetItem } from '../../../dataset/types';
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
	let initialUrlConfig: Partial<GraphStateConfig> | undefined = undefined;

	const store = withLogMiddleware(
		withSingleKeyUrlStorage<IFilterStore>(baseStore, 'filter', urlEncodeFilterState, (param) => {
			if (param) {
				initialUrlConfig = urlDecodeObject(param);
			}
			// do not use URL state to set initial store
			return initialStore;
		}),
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

	// FIXME: simple rerender hack for now
	const storeToUrl = () => store.update((state) => state);

	const reloadCurrentGraph = async () => {
		// reload state with table changes
		const state = get(store);
		if (state.graphOptions) {
			state.graphOptions.reloadFilterOptions();
			await state.graphOptions.applyOptionsIfValid();
		}
	};

	const loadBuildInTables = async (
		dataset: Dataset,
		tablePaths: DatasetItem[],
		preventUrlUpdate: boolean = false
	) => {
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
		} catch {
			notificationStore.error({
				message: 'Failed to load external tables',
				description: tablePaths.map((table) => table.name).join(',')
			});
		}
		if (!preventUrlUpdate) {
			storeToUrl();
		}
	};

	const loadTableFromURL = async (
		url: URL,
		tableName?: string,
		preventUrlUpdate: boolean = false
	) => {
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
		} catch (err) {
			notificationStore.error({
				message: 'Failed to load tables from file',
				description: `${tableReferences.map((table) => table.tableName).join(',')}, err=${
					err ?? 'Unknown Error'
				}`
			});
		}
		if (!preventUrlUpdate) {
			storeToUrl();
		}
	};

	const loadTablesFromFiles = async (
		fileList: FileList,
		tableName?: string,
		preventUrlUpdate: boolean = false
	) => {
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
		} catch (err) {
			notificationStore.error({
				message: 'Failed to load tables from file',
				description: `${tableReferences.map((table) => table.tableName).join(',')}, err=${
					err ?? 'Unknown Error'
				}`
			});
		}
		if (!preventUrlUpdate) {
			storeToUrl();
		}
	};

	const setGraphModel = (
		type?: GraphType,
		graphState?: {
			data?: Record<string, unknown>;
			render?: Record<string, unknown>;
		}
	) => {
		update((state) => {
			if (!type) {
				state.graphOptions = undefined;

				return state;
			}

			switch (type) {
				case GraphType.PLANE:
					state.graphOptions = new PlaneGraphModel(graphState?.data, graphState?.render);
					// FIXME: hack to trigger URL persistance
					state.graphOptions.dataStore.subscribe(storeToUrl);
			}

			return state;
		});
	};

	const reloadWithState = async (
		config: Partial<GraphStateConfig>,
		overrides: DeepPartial<GraphStateConfig> = {}
	) => {
		const datasets = get(store).preloadedDatasets;
		console.debug('init from config ', { config, datasets });

		if (config.selectedTables) {
			for (const table of config.selectedTables) {
				const loadedDatasets: Record<string, DatasetItem[]> = {};
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
					await loadBuildInTables(
						datasets.find((dataset) => dataset.name === datasetName)!,
						items,
						true
					);
				}
			}
		}
		if (config.graphOption) {
			const combinedData =
				config.graphOption?.data || overrides.graphOption?.data
					? { ...(config.graphOption?.data ?? {}), ...(overrides.graphOption?.data ?? {}) }
					: undefined;
			const combinedRenderOptions =
				config.graphOption?.render || overrides.graphOption?.render
					? {
							...(config.graphOption?.render ?? {}),
							...(overrides.graphOption?.render ?? {})
					  }
					: undefined;

			setGraphModel(config.graphOption.type, { data: combinedData, render: combinedRenderOptions });
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
				store.config = config;
				return store;
			});

			// reset current state
			await dataStore.resetDatabase();
			store.update((state) => {
				state.graphOptions = undefined;
				return state;
			});
			// if we have a config it takes precedence over URL decoding
			if (config) {
				await reloadWithState(config, initialUrlConfig);
			} else if (initialUrlConfig) {
				// try to apply state in the config
				await reloadWithState(initialUrlConfig);
			}
			await reloadCurrentGraph();

			setIsLoading(false);
			return;
		},

		selectGraphType: async (graphType: GraphType) => {
			const state = get(store).graphOptions?.toStateObject();
			setGraphModel(graphType, state);
		}
	};
};

export default _filterStore();
