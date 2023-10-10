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

export interface DatasetFile {
	name: string;
	infoURL: string;
	dataURL: string;
}

export type DatasetFileIndex = number;

export interface Dataset {
	name: string;
	path: string;
	items: DatasetItem[];
}

export interface DatasetItem {
	name: string;
	path: string;
	files: DatasetFile[];
}

export type DatasetRegistry = DatasetItem[];
