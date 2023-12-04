import { get } from "svelte/store";
import { dataStore } from "../dataStore/DataStore";
import { defaultUrlDecoder, defaultUrlEncoder, urlDecodeObject, urlEncodeObject } from "../urlStorage";
import type { GraphOptions, GraphStateConfig, GraphType, IFilterStore, IMinimalTableRef } from "./types";
import { TableSource } from "../dataStore/types";


export const toStateObject = (state: IFilterStore): GraphStateConfig => {

    const tables:IMinimalTableRef[] = Object.entries(get(dataStore).tables).map(
        ([tableName, table]) => ({
            tableName,
            // build in only need one of the sources
            // since a table in a dataset can be composed from multiple parts
            refs: table.refs.length > 0 ? [{
                source: table.refs[0].source,
                datasetName: table.refs[0].source == TableSource.BUILD_IN ? table.refs[0].datasetName : undefined
            }] : []})
    );


        // 	({
        // 		source: el.source,
        // 		tableName: el.tableName,
        // 		datasetName: el.source == TableSource.BUILD_IN ? el.dataset.name : undefined
        // 	} as UrlTableSelection)

    return {selectedTables: tables,
    // Probably defer this?
    graphOption: state.graphOptions && {
        type: state.graphOptions!.getType(),
        state: state.graphOptions!.toStateObject()
    }
};
}



// Stores currently loaded DB state and filter selections
export const urlEncodeFilterState = (state: IFilterStore):string => {

    return urlEncodeObject(toStateObject(state))
}

// export const urlDecodeFilterState = (param: string): IFilterStore {
//         const value = urlDecodeObject(param);
// 				const graphType = value as GraphType;
// 				switch (graphType) {
// 					case GraphType.PLANE: {
// 						urlRestoredGraphOptions = new PlaneGraphModel();
// 						return undefined;
// 					}
// 				}
// 				break;
// 			}
// 			case 'selectedTables': {
// 				urlRestoredTableSelection = defaultUrlDecoder(key, type, value) as UrlTableSelection[];

// 				return [];
// 			}
// 		}

// 		return defaultUrlDecoder(key, type, value);
// 	};


// }