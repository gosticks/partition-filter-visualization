interface FSObject {
	name: string;
	fullPath: string;
}

export enum FSObjectType {
	DIR,
	FILE
}

export interface FSFile extends FSObject {
	ext: string;
	type: FSObjectType.FILE;
}

export interface FSDirectory extends FSObject {
	type: FSObjectType.DIR;
	children: FSItem[];
}

export type FSItem = FSFile | FSDirectory;

export interface DatasetItem {
	name: string;
	infoURL: string;
	dataURL: string;
}

export type DatasetItemIndex = number;

export interface Dataset {
	name: string;
	path: string;
	entries: DatasetPath[];
}

export interface DatasetPath {
	name: string;
	path: string;
	entries: DatasetItem[];
	variants: { default: number[] } & Record<string, DatasetItemIndex[]>;
}

export type DatasetRegistry = DatasetPath[];
