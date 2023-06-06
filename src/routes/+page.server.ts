// Fetch all available data entries

import type { Load } from '@sveltejs/kit';

export type DataEntry = {
	name: string;
	infoUrl: string;
	dataUrl: string;
};

export type EntryDefinition = {
	name: string;
	iterations: number;
	preprocess: string;
	fixutre: string;
	generator: string;
	// FIXME: add missing fields maybe generate even
};

export const load: Load = async ({ params }) => {
	// Use glob to index all available data entries
	const definitions = await import.meta.glob('/static/datasets/*/*.json');
	const data = await import.meta.glob('/static/datasets/*/*.csv');

	const dataEntries: DataEntry[] = [];

	// Iterate over found modules
	for (const path in definitions) {
		// Simplit path into [filter]/[name] and remove extension
		const [filter, name] = path
			.split('/')
			.slice(-2)
			.map((p) => p.replace('.json', ''));

		// load defintiion info
		const info: EntryDefinition = (await definitions[path]()) as EntryDefinition;

		dataEntries.push({
			name: info.name,
			infoUrl: `/datasets/${filter}/${name}.json`,
			dataUrl: `/datasets/${filter}/${name}.csv`
		});
	}

	return {
		data: dataEntries
	};
};
