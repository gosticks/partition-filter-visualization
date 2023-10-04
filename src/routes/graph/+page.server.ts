// Fetch all available data entries

import { base } from '$app/paths';
import type { Load } from '@sveltejs/kit';
import parseDataset from '../../dataset/tumPartitionParser.server';

export type DataEntry = {
	name: string;
	fixture: string;
	filterName: string;
	infoUrl: string;
	dataUrl: string;
};

export type EntryDefinition = {
	name: string;
	iterations: number;
	preprocess: string;
	fixture: string;
	generator: string;
	// FIXME: add missing fields maybe generate even
};

export type FilterEntry = {
	name: string;
	entries: DataEntry[];
};

export type DatasetSample = {
	name: string;
	path: string;
	entries: DataEntry[];
};

export type FsFile = {
	name: string;
	path: string;
};

export type FsDirectory = {
	name: string;
	path: string;
	children: (FsFile | FsDirectory)[];
};

export type Dataset = FsFile | FsDirectory;

const datasetPath = '/static/dataset';

export const load: Load = async ({ params }) => {
	// Use glob to index all available data entries
	const definitions = await import.meta.glob('/static/dataset/*/*.json');
	// const data = await import.meta.glob('/static/datasets/*/*.csv');

	const dataset = parseDataset(`.${datasetPath}`);

	// Translate dataset file tree into comparable dataset items
	// this is dataset specific and only intended to work for tum-db/partition-filters

	const dataEntries: DataEntry[] = [];
	const filters: { [key: string]: FilterEntry } = {};

	// // Iterate over found modules
	// for (const path in definitions) {
	// 	// Simplit path into [filter]/[name] and remove extension
	// 	let [filter, name] = path
	// 		.split('/')
	// 		.slice(-2)
	// 		.map((p) => p.replace('.json', ''));

	// 	filter = filter.replace('_part', '');

	// 	// load defintiion info
	// 	const info: EntryDefinition = (await definitions[path]()) as EntryDefinition;

	// 	// console.log(info.name);

	// 	const entry = {
	// 		name: info.name,
	// 		// FIXME: just a temporary hack to get the filter name -> add this value to test output
	// 		filterName: info.name.split(' ')[0],
	// 		fixture: info.fixture,
	// 		infoUrl: `${base}/datasets/${filter}/${name}.json`,
	// 		dataUrl: `${base}/datasets/${filter}/${name}.csv`
	// 	};

	// 	dataEntries.push(entry);

	// 	// Construct build time filters
	// 	if (!filters[filter]) {
	// 		filters[filter] = {
	// 			name: filter,
	// 			entries: [entry]
	// 		};
	// 	} else {
	// 		filters[filter].entries.push(entry);
	// 	}
	// }
	return {
		dataset
		// data: dataEntries,
		// filters: filters
	};
};
