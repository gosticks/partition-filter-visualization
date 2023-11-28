import fs from 'fs';
import path from 'path';
import {
	FSObjectType,
	type FSDirectory,
	type FSItem,
	type FSFile,
	type DatasetFile,
	type DatasetItem,
	type Dataset
} from './types';

const parseDirectory = (dir: string, stripPrefix: string | undefined = undefined): FSItem[] => {
	const walkDir = (dir: string): FSItem[] =>
		fs.readdirSync(dir).map((f) => {
			const dirPath = path.join(dir, f);
			const isDirectory = fs.statSync(dirPath).isDirectory();

			let elementPath = '';
			if (stripPrefix && dirPath.startsWith(stripPrefix)) {
				elementPath = dirPath.slice(stripPrefix.length, dirPath.length);
			}

			if (!isDirectory) {
				return {
					name: f,
					ext: path.extname(f),
					fullPath: elementPath,
					type: FSObjectType.FILE
				} as FSFile;
			}

			return {
				name: f,
				type: FSObjectType.DIR,
				fullPath: elementPath,
				children: walkDir(dirPath)
			} as FSDirectory;
		});

	return walkDir(dir);
};

const regex =
	/^(.*)_(construct|count)(?:_mt)?(?:_(part))?(?:_(100m|1m|10k))?(?:-(\d))?(?:_(.*))?\.(.*)$/;

const parseDatasetFiles = (dir: FSDirectory): DatasetItem[] => {
	const paths: DatasetItem[] = [];

	for (const [i, item] of dir.children.entries()) {
		if (item.type === FSObjectType.DIR || item.name.endsWith('.json')) {
			continue;
		}

		const res = regex.exec(item.name);
		if (!res) {
			continue;
		}

		const [name, filter, benchType, isPart, numItems, partNum, group, ext] = res;
		const itemName = `${filter}_${benchType}${group ? `_${group}` : ''}`;
		const pathItem: DatasetItem = {
			name: itemName,
			path: dir.fullPath,
			files: [
				{
					name: itemName,
					dataURL: item.name.replace('.json', '.csv'),
					infoURL: item.name
				}
			]
		};

		paths.push(pathItem);
	}
	return paths;
};

const toDatasetFile = (file: FSFile): DatasetFile => ({
	name: file.name.replace('.json', ''),
	dataURL: file.fullPath.replace('.json', '.csv'),
	infoURL: file.fullPath
});

const parseExperimentDatasetFile = (dir: FSDirectory): DatasetItem[] => {
	const variants: Record<string, DatasetItem> = {};

	for (const [i, item] of dir.children.entries()) {
		if (item.type === FSObjectType.DIR) {
			continue;
		}
		// skip non JSON files
		if (path.extname(item.name) !== '.json') {
			continue;
		}

		const res = regex.exec(item.name);
		if (!res) {
			continue;
		}

		const [name, filter, benchType, isPart, numItems, partNum, group, ext] = res;

		const variantName = [filter, benchType, numItems, group]
			.filter((item) => item !== undefined)
			.join('-');

		if (typeof variants[variantName] === 'undefined') {
			variants[variantName] = {
				name: variantName,
				path: dir.fullPath,
				files: [toDatasetFile(item)]
			};
		} else {
			variants[variantName].files.push(toDatasetFile(item));
		}
	}
	return Object.values(variants);
};

const combineItems = (items: DatasetItem[]): DatasetItem[] => {
	const namedItems: Record<string, DatasetItem> = {};

	for (const item of items) {
		if (namedItems[item.name]) {
			namedItems[item.name].files.push(...item.files);
		} else {
			namedItems[item.name] = item;
		}
	}

	return Object.values(namedItems);
};

const parseDataset = (datasetPath: string) => {
	const dir = parseDirectory(datasetPath, 'static/');

	// Translate dir into dataset
	const results: Dataset[] = dir.flatMap((item, index, arr) => {
		if (item.type != FSObjectType.DIR) {
			return [];
		}

		// Experiment is special case since same dataset is split
		// into multiple folders and name_part
		switch (item.name) {
			case 'background': {
				return [];
			}
			case 'experiments': {
				// combine folders with part suffix
				const items: DatasetItem[] = [];
				for (const el of item.children) {
					if (el.type != FSObjectType.DIR) {
						continue;
					}
					items.push(...parseExperimentDatasetFile(el));
				}

				const result: Dataset = {
					name: item.name,
					path: item.fullPath,
					items: combineItems(items)
				};
				return [result];
			}
			default: {
				const walkTree = (item: FSDirectory, prefix?: string): Dataset[] => {
					if (item.type === FSObjectType.DIR) {
						const isDeepestRoot = item.children.every((child) => child.type === FSObjectType.FILE);

						if (isDeepestRoot) {
							return [
								{
									name: (prefix ? `${prefix}/` : '') + item.name,
									path: item.fullPath,
									items: parseDatasetFiles(item)
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
