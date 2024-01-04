import { get } from 'svelte/store';
import { dataStore } from '../dataStore/DataStore';
import { urlEncodeObject } from '../urlStorage';
import type { GraphStateConfig, IFilterStore, IMinimalTableRef } from './types';
import { TableSource } from '../dataStore/types';
import { updatedDiff } from 'deep-object-diff';

export const toStateObject = (state: IFilterStore): GraphStateConfig => {
	const tables: IMinimalTableRef[] = Object.entries(get(dataStore).tables).map(
		([tableName, table]) => ({
			tableName,
			// build in only need one of the sources
			// since a table in a dataset can be composed from multiple parts
			refs:
				(table.refs ?? []).length > 0
					? [
							{
								source: table.refs[0].source,
								datasetName:
									table.refs[0].source == TableSource.BUILD_IN
										? table.refs[0].datasetName
										: undefined
							}
					  ]
					: []
		})
	);

	// 	({
	// 		source: el.source,
	// 		tableName: el.tableName,
	// 		datasetName: el.source == TableSource.BUILD_IN ? el.dataset.name : undefined
	// 	} as UrlTableSelection)

	return {
		selectedTables: tables,
		// Probably defer this?
		graphOption: state.graphOptions && {
			type: state.graphOptions!.getType(),
			...(state.graphOptions!.toStateObject() as any)
		}
	};
};

// Stores currently loaded DB state and filter selections
export const urlEncodeFilterState = (state: IFilterStore): string | null => {
	const newState = toStateObject(state);
	if (state.config) {
		const d = updatedDiff(state.config, newState) as Partial<GraphStateConfig>;
		if (Object.keys(d).length === 0) {
			return null;
		}
		return urlEncodeObject(d);
	}
	return urlEncodeObject(newState);
};
