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

export interface ITableEntry {
	name: string;
	dataUrl: string;
	schema: TableSchema;
	filterOptions: FilterOptions;
}

export interface IDataStore {
	db: AsyncDuckDB | null;
	isLoading: boolean;
	sharedConnection: AsyncDuckDBConnection | null;
	// Property to keep track of which tables have been loaded
	tables: Record<string, ITableEntry>;
	// Table schema shared across all tables
	combinedSchema: TableSchema;
	previousQueries: { query: string; success: boolean; executionTime: number }[];
}