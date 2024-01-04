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

export enum TransformationType {
	SQL,
	JS
}

export type BaseTableTransformation = {
	name: string;
	description: string;
	type: TransformationType;
	resultSchema?: TableSchema;
	required?: boolean;
};

export type SqlTransformation = BaseTableTransformation & {
	type: TransformationType.SQL;
	query: string;
};

export type JsTransformation = BaseTableTransformation & {
	type: TransformationType.JS;
	method: (tableName: string, info: ILoadedTable) => Promise<boolean>;
};

export type TableTransformation = SqlTransformation | JsTransformation;

export interface ILoadedTable {
	tableName: string; // Table name that should be used for query operations with transformations applied
	displayName: string; // Defaults to table name
	schema: TableSchema; // Schema after all transformations were applied
	sourceSchema: TableSchema; // Schema of raw/unmodified table
	sourceTableName: Readonly<string>; // Unmodified table loaded by user
	transformations: TableTransformation[];
	refs: ITableReference[]; // can be multiple since a single table can be multiple files
	filterOptions: FilterOptions;
}

export type DbQueryHistoryItem = {
	query: string;
	success: boolean;
	executionTime: number;
};

export interface IDataStore {
	db: AsyncDuckDB | null;
	isLoading: boolean;
	sharedConnection: AsyncDuckDBConnection | null;
	// stores currently loaded tables and sources
	tables: Record<string, ILoadedTable>;
	// Table schema shared across all tables
	combinedSchema: TableSchema;

	// FIXME: hide behind debug flag
	previousQueries: DbQueryHistoryItem[];
}
