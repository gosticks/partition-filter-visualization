import { get, writable } from 'svelte/store';
import { dataStore } from './dataStore/DataStore';
import type { FilterEntry } from '../../routes/graph/proxy+page.server';
import type { GraphRenderer } from '$lib/rendering/GraphRenderer';
import { PlaneRenderer } from '$lib/rendering/PlaneRenderer';
import type { FilterOptions } from './dataStore/types';
import { withUrlStorage } from './urlStorage';

export const enum GraphType {
	PLANE = 'plane'
}

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

export interface IFilterStore {
	isLoading: boolean;
	preloadedTables: { label: string; value: FilterEntry }[];
	// List of available filter options
	filterOptions: FilterOptions;
	graphType: GraphType;
	graphOptions?: IFilterStoreGraphOptions;
	selectedPoint?: THREE.Vector3;
	filterRenderer?: { data: { data: Float32Array[][]; scaleY: number }; renderer: GraphRenderer };
}

const _filterStore = () => {
	const store = withUrlStorage(
		writable<IFilterStore>({
		isLoading: true,
		graphType: GraphType.PLANE,
		preloadedTables: [],
		filterOptions: {}
		}),
		{
			graphType: 'string',
			graphOptions: 'object'
		}
	);

	const { set, update, subscribe } = store;

	return {
		set,
		update,
		subscribe,

		// Actions
		setPreloadedTables: (tables: Record<string, FilterEntry>) => {
			const preloadedTables = Object.entries(tables).map(([label, value]) => ({
				label,
				value
			}));

			update((store) => {
				store.preloadedTables = preloadedTables;
				store.isLoading = false;
				return store;
			});
		},
		setGraphOptions: async (graphOptions?: IFilterStoreGraphOptions) => {
			if (!graphOptions) {
				return;
			}

			switch (graphOptions.type) {
				case GraphType.PLANE: {
					const { x, y, z } = graphOptions.options;
					if (!x || !y || !z) {
						throw new Error('Invalid graph options');
					}

					const tileCount = 20;

					const planeProvider = new PlaneRenderer();

					// Query tiled data for each mode
					const modes = ['Naive64', 'Blocked64'];
					const options = {
						xColumnName: x,
						yColumnName: y,
						zColumnName: z,
						xTileCount: tileCount,
						zTileCount: tileCount
					};
					const promise = Promise.all(
						modes.map((mode) => dataStore.getTiledData('bloom', mode, options))
					);
					try {
						const data = await promise;

						planeProvider.onDataPointSelected = (point) => {
							update((store) => {
								console.log('Selected point', point);
								store.selectedPoint = point;
								return store;
							});
						};

						update((store) => {
							store.graphOptions = graphOptions;
							store.filterRenderer = {
								renderer: planeProvider,
								data: {
									data: data,
									scaleY: 1
								}
							};

							// Store filter state in URL
							const params = new URLSearchParams(location.search);
							const encoded = btoa(JSON.stringify(graphOptions));
							params.set('filter', encoded);
							history.replaceState(null, '', `${location.pathname}?${params.toString()}`);

							return store;
						});
					} catch (e) {
						console.error('Failed to load tiled data:', e);
						return;
					}
				}
			}
		}
	};
};

export default _filterStore();
