import fs from 'fs';
import path from 'path';
import {
	FSObjectType,
	type FSDirectory,
	type FSItem,
	type FSFile,
	type DatasetItem,
	type DatasetPath,
	type Dataset
} from './types';

const parseDirectory = (dir: string): FSItem[] => {
	const walkDir = (dir: string): FSItem[] =>
		fs.readdirSync(dir).map((f) => {
			const dirPath = path.join(dir, f);
			const isDirectory = fs.statSync(dirPath).isDirectory();

			if (!isDirectory) {
				return {
					name: f,
					ext: path.extname(f),
					fullPath: dirPath,
					type: FSObjectType.FILE
				} as FSFile;
			}

			return {
				name: f,
				type: FSObjectType.DIR,
				fullPath: dirPath,
				children: walkDir(dirPath)
			} as FSDirectory;
		});

	return walkDir(dir);
};

const regex = /^(.*)_(construct|count)(?:_mt)?(?:_(part))?(?:_(100m|1m|10k))?(?:_(.*))?\.(.*)$/;

const parseDatasetItems = (dir: FSDirectory): DatasetPath[] => {
	const paths: DatasetPath[] = [];

	for (const [i, item] of dir.children.entries()) {
		if (item.type === FSObjectType.DIR || item.name.endsWith('.json')) {
			continue;
		}

		const res = regex.exec(item.name);
		if (!res) {
			continue;
		}

		const pathItem: DatasetPath = {
			name: item.name,
			path: dir.fullPath.replace('static/', '/'),
			entries: [
				{
					name: item.name.replace('.json', ''),
					dataURL: item.name.replace('.json', '.csv'),
					infoURL: item.name
				}
			],
			// add default variant
			variants: { default: [0] }
		};

		const [name, filter, benchType, isPart, numItems, group, ext] = res;

		console.log('############## res', res);
		paths.push(pathItem);
		// dp.name = name;

		// const variantName = `${numItems ? `${numItems}` : 'default'}`;

		// if (dp.variants[variantName] === undefined) {
		// 	dp.variants[variantName] = [i];
		// } else {
		// 	dp.variants[variantName] = [...dp.variants[variantName], i];
		// }
	}

	return paths;
};

const parseExperimentDatasetItem = (dir: FSDirectory): DatasetPath => {
	const dp: DatasetPath = {
		name: dir.name,
		path: dir.fullPath.replace('static/', '/'),
		entries: dir.children
			.filter((item) => item.type === FSObjectType.FILE && item.name.endsWith('.json'))
			.map((item) => ({
				name: item.name.replace('.json', ''),
				dataURL: item.name.replace('.json', '.csv'),
				infoURL: item.name
			})),
		variants: {}
	};

	for (const [i, item] of dir.children.entries()) {
		if (item.type === FSObjectType.DIR) {
			continue;
		}

		const res = regex.exec(item.name);
		if (!res) {
			continue;
		}

		const [name, filter, benchType, isPart, numItems, group, ext] = res;

		// skip non JSON files
		if (ext !== 'json') {
			continue;
		}

		dp.name = name;

		const variantName = `${numItems ? `${numItems}` : 'default'}`;

		if (dp.variants[variantName] === undefined) {
			dp.variants[variantName] = [i];
		} else {
			dp.variants[variantName] = [...dp.variants[variantName], i];
		}
	}

	return dp;
};

const parseDataset = (datasetPath: string) => {
	const dir = parseDirectory(datasetPath);

	// Translate dir into dataset
	const results: Dataset[] = dir.flatMap((item, index, arr) => {
		if (item.type != FSObjectType.DIR) {
			return;
		}

		// Experiment is special case since same dataset is split
		// into multiple folders and name_part
		switch (item.name) {
			case 'background': {
				return [];
			}
			case 'experiments': {
				// combine folders with part suffix
				const items: Record<string, DatasetPath> = {};
				for (const el of item.children) {
					if (el.type != FSObjectType.DIR) {
						continue;
					}

					// Treat each competitor as its own dataset
					if (el.name === 'competitors') {
						// FIXME: implement custom handling for competitors
						continue;
					}

					// const children = el.children.filter((c) => c.type === FSObjectType.FILE) as FSFile[];
					const name = el.name.replace('_part', '');
					const prevItem = items[name];

					const item = parseExperimentDatasetItem(el);

					if (!prevItem) {
						items[name] = item;
						continue;
					}

					// TODO: combine variants

					items[name] = {
						...prevItem,
						variants: {
							...prevItem.variants
						}
					};
				}

				const result: Dataset = {
					name: item.name,
					path: item.fullPath,
					entries: Object.values(items)
				};

				return [result];
			}
			default: {
				const walkTree = (item: FSDirectory, prefix?: string): Dataset[] => {
					if (item.type === FSObjectType.DIR) {
						const isDeepestRoot = item.children.every((child) => child.type === FSObjectType.FILE);

						if (isDeepestRoot) {
							console.log('####### Deepest root', item.fullPath, isDeepestRoot);
							return [
								{
									name: (prefix ? `${prefix}/` : '') + item.name,
									path: item.fullPath,
									entries: parseDatasetItems(item)
								}
							];
						}

						return item.children
							.filter((child) => child.type === FSObjectType.DIR)
							.flatMap((child) =>
								walkTree(child as FSDirectory, prefix ? `${prefix}/${item.name}` : item.name)
							);
					}
					return [];
				};

				const items = walkTree(item);

				return items;
			}
		}
	});

	return results.filter((ds) => ds !== undefined) as Dataset[];
};

export default parseDataset;
