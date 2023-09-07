import { get, writable } from 'svelte/store';
import { dataStore } from '../dataStore/DataStore';
import type { FilterEntry } from '../../../routes/graph/proxy+page.server';
import {
	withUrlStorage,
	type UrlEncoder,
	urlEncodeObject,
	defaultUrlEncoder,
	type UrlDecoder,
	defaultUrlDecoder,
	urlDecodeObject
} from '../urlStorage';
import {
	type IFilterStore,
	type ITableReference,
	TableSource,
	GraphOptions,
	GraphType
} from './types';
import { PlaneGraphOptions, type PlaneGraphState } from './graphs/plane';
import { defaultLogOptions, withLogMiddleware } from '../logMiddleware';

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
	preloadedTables: [],
	selectedTables: []
};

const urlEncoder: UrlEncoder = (key, type, value) => {
	if (key === 'graphOptions') {
		const graphOptions = value as GraphOptions;
		const state = graphOptions.getCurrentOptions();

		return urlEncodeObject({
			type: graphOptions.getType(),
			state: state
		});
	}
	const encodedValue = defaultUrlEncoder(key, type, value);
	// console.log('Encoding', key, encodedValue, value, JSON.stringify(value));
	return encodedValue;
};

const urlDecoder: UrlDecoder = (key, type, value) => {
	if (key === 'graphOptions') {
		const val = urlDecodeObject(value) as { type: GraphType; state: unknown } | null;

		if (!val) {
			return null;
		}

		const { type, state } = val;

		switch (type) {
			case GraphType.PLANE: {
				console.debug('Decoded plane graph options', state);
				return new PlaneGraphOptions(state as Partial<PlaneGraphState>);
			}
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

	const selectTables = async (tables: ITableReference[]) => {
		setIsLoading(true);
		// Load tables into data store
		try {
			const loadedTables = await dataStore.loadTableReferences(tables);
			store.update((store) => {
				store.selectedTables = tables;
				return store;
			});
		} catch (e) {
			console.error('Failed to load tables:', e);
			return;
		} finally {
			setIsLoading(false);
		}
	};

	return {
		set,
		update,
		subscribe,

		reset: () => {
			dataStore.resetDatabase();
			const newInitialState = JSON.parse(JSON.stringify(initialStore));

			// Inject init preloaded tables
			newInitialState.preloadedTables = get(store).preloadedTables;
			newInitialState.isLoading = false;
			set(newInitialState);
		},

		// Actions
		initWithPreloadedTables: async (tables: Record<string, FilterEntry>) => {
			setIsLoading(true);
			const preloadedTables = Object.entries(tables).map(([label, value]) => ({
				label,
				value
			}));

			update((store) => {
				store.preloadedTables = preloadedTables;
				return store;
			});

			// Attempt reloading selected tables
			const { selectedTables } = get(store);
			if (selectedTables.length) {
				try {
					await selectTables(selectedTables);
					const { graphOptions } = get(store);
					if (graphOptions) {
						await graphOptions.applyOptionsIfValid();
					}
				} catch (e) {
					console.error('Failed to load selected tables:', e);
				}
			}

			setIsLoading(false);
		},

		selectTables,

		selectBuildInTables: async (tables: FilterEntry[]) => {
			// Convert filter options to table references
			const tableReferences: ITableReference[] = tables.flatMap((t) =>
				t.entries.map((e) => ({
					name: e.name,
					tableName: t.name,
					source: TableSource.BUILD_IN,
					url: e.dataUrl
				}))
			);

			return selectTables(tableReferences);
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
		},

		setGraphOptions: async (options: Record<string, unknown>) => {
			const { graphOptions } = get(store);
			if (!graphOptions) {
				return;
			}

			update((store) => {
				Object.entries(options).forEach(([key, value]) => {
					graphOptions.setStateValue(key, value);
				});
				return store;
			});

			setIsLoading(true);

			// Apply filter if valid
			try {
				await graphOptions.applyOptionsIfValid();
			} catch (e) {
				console.error('Failed to apply graph options:', e);
			} finally {
				setIsLoading(false);
			}

			// switch (graphOptions.type) {
			// 	case GraphType.PLANE: {
			// 		const { x, y, z } = graphOptions.options;
			// 		if (!x || !y || !z) {
			// 			console.error('Invalid graph options', graphOptions);
			// 			throw new Error('Invalid graph options');
			// 		}

			// 		const planeProvider = new PlaneRenderer();

			// 		// Query tiled data for each mode
			// 		const modes = ['Naive64', 'Blocked64'];
			// 		const options = {
			// 			xColumnName: x,
			// 			yColumnName: y,
			// 			zColumnName: z,
			// 			xTileCount: graphOptions.options.axisRanges.,
			// 			zTileCount: tileCount
			// 		};
			// 		const promise = Promise.all(
			// 			modes.map((mode) => dataStore.getTiledData('bloom', mode, options))
			// 		);
			// 		try {
			// 			const data = await promise;

			// 			planeProvider.onDataPointSelected = (point) => {
			// 				update((store) => {
			// 					console.log('Selected point', point);
			// 					store.selectedPoint = point;
			// 					return store;
			// 				});
			// 			};

			// 			update((store) => {
			// 				store.graphOptions = graphOptions;
			// 				store.filterRenderer = {
			// 					renderer: planeProvider,
			// 					data: {
			// 						data: data,
			// 						scaleY: 1
			// 					}
			// 				};

			// 				return store;
			// 			});
			// 		} catch (e) {
			// 			console.error('Failed to load tiled data:', e);
			// 			return;
			// 		}
			// 	}
			// }
		}
	};
};

export default _filterStore();
