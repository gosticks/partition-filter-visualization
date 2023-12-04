import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';

export type FilterOptions = Record<string, { options: unknown[]; label?: string; type: string }>;
export type TableSchema = Record<string, 'number' | 'string'>;

export enum DataScaling {
	LINEAR = 'linear',
	LOG = 'log'
}

export enum DataAggregation {
	MIN = 'min',
	MAX = 'max',
	AVG = 'avg',
	SUM = 'sum'
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
	// build in tables are ordered in folders
	// we call these folders datasets since they indicate
	// comparable table structure
	datasetName: string;
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

export interface ILoadedTable {
	name: string;
	displayName?: string;
	schema: TableSchema;
	refs: ITableReference[]; // can be multiple since a single table can be multiple files
	filterOptions: FilterOptions;
}

export interface IDataStore {
	db: AsyncDuckDB | null;
	isLoading: boolean;
	sharedConnection: AsyncDuckDBConnection | null;
	// stores currently loaded tables and sources
	tables: Record<string, ILoadedTable>;
	// Table schema shared across all tables
	combinedSchema: TableSchema;

	// FIXME: hide behind debug flag
	previousQueries: { query: string; success: boolean; executionTime: number }[];
}
