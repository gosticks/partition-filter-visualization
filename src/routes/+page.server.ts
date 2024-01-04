// Fetch all available data entries
import fs from 'fs';
import path from 'path';
import base from '$app/paths';
import type { Load } from '@sveltejs/kit';

export type NamedGraph = {
	name: string;
	description?: string;
	href: string;
	configPath: string;
};

const graphPath = 'static/graphs';

export const load: Load = async ({ params }) => {
	const items: NamedGraph[] = fs
		.readdirSync(graphPath)
		.map((fileName) => {
			const fullPath = path.join(graphPath, fileName);
			const isDirectory = fs.statSync(fullPath).isDirectory();

			if (isDirectory) {
				return null;
			}

			// read file content to get basic info
			try {
				const content = fs.readFileSync(fullPath) as unknown as string;
				const values = JSON.parse(content);
				const res: NamedGraph = {
					name: values['name'] ?? '',
					description: values['description'] ?? '',
					href: fileName.replace('.json', ''),
					configPath: `${base ?? '/'}${fullPath}`
				};
				console.log(res);
				return res;
			} catch (err) {
				console.error(`Failed to process graph file: ${err}`);
				return null;
			}
		})
		.filter((v) => v !== null) as NamedGraph[];
	return {
		items
		// data: dataEntries,
		// filters: filters
	};
};
