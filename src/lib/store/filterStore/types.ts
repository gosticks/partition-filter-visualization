import type { FilterEntry } from '$routes/graph/+page.server';
import type { Readable } from 'svelte/store';
import type { Dataset } from '../../../dataset/types';

export enum GraphType {
	PLANE = 'plane'
}

export type DeepPartial<T> = {
	[P in keyof T]?: DeepPartial<T[P]>;
};

export type SimpleGraphFilterOption =
	| (
			| {
					type: 'string';
					options: string[];
					label: string;
					default?: string;
			  }
			| {
					type: 'number';
					options: number[];
					label: string;
					default?: number;
			  }
			| {
					type: 'boolean';
					label: string;
					default?: boolean;
			  }
	  ) & {
			required?: boolean;
	  };

export type GraphFilterOption<T> =
	| SimpleGraphFilterOption
	| {
			type: 'row';
			keys: (keyof T)[];
			grow?: number[]; // Flex grow factor default 1 for all
			items: SimpleGraphFilterOption[];
	  };

export type GraphFilterOptions<T> = Partial<Record<keyof T, GraphFilterOption<T>>>;

export abstract class GraphOptions<
	Options extends Record<string, unknown> = Record<string, unknown>,
	Data = unknown,
	K extends keyof Options = keyof Options
> {
	public active = false;
	public filterOptions: GraphFilterOptions<Options>;

	constructor(filterOptions: GraphFilterOptions<Options>) {
		this.filterOptions = filterOptions;
	}

	public abstract getType(): GraphType;
	public abstract applyOptionsIfValid(): Promise<void>;
	public abstract reloadFilterOptions(): void;
	public abstract setFilterOption(key: K, value: Options[K]): void;

	public abstract dataStore: Readable<Data | undefined>;
	public abstract optionsStore: Readable<Options | undefined>;

	public abstract toString(): string;
	public static fromString(str: string): GraphOptions | null {
		return null;
	}
}

export interface IFilterStore {
	isLoading: boolean;
	preloadedDatasets: Dataset[];
	// List of available filter options
	// filterOptions: FilterOptions;
	selectedDataset?: Dataset;
	selectedTables: ITableReference[];
	graphOptions?: GraphOptions;
}

export enum TableSource {
	BUILD_IN,
	URL,
	FILE
}

interface ITableRef {
	tableName: string;
	displayName?: string;
}

export interface ITableBuildIn extends ITableRef {
	source: TableSource.BUILD_IN;
	url: string;
	dataset: Dataset;
}

export interface ITableExternalUrl extends ITableRef {
	source: TableSource.URL;
	url: string;
}

export interface ITableExternalFile extends ITableRef {
	source: TableSource.FILE;
	file: File;
}

export type ITableReference = ITableBuildIn | ITableExternalFile | ITableExternalUrl;

export type ITableRefList = ITableBuildIn[] | ITableExternalFile[] | ITableExternalUrl[];
