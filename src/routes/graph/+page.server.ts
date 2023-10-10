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
	const dataset = parseDataset(`.${datasetPath}`);

	return {
		dataset
		// data: dataEntries,
		// filters: filters
	};
};
