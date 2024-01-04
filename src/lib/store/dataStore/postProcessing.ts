import type { Writable } from 'svelte/store';
import type { BaseStoreType } from './DataStore';
import {
	TransformationType,
	type IDataStore,
	type ILoadedTable,
	type ITableReference,
	TableSource,
	type TableTransformation,
	type JsTransformation
} from './types';
import notificationStore from '../notificationStore';

type Jsonable =
	| string
	| number
	| boolean
	| null
	| undefined
	| readonly Jsonable[]
	| { readonly [key: string]: Jsonable }
	| { toJSON(): Jsonable };
export class PostProeccingError extends Error {
	public readonly context?: Jsonable;

	constructor(message: string, options: { cause?: unknown; context?: Jsonable } = {}) {
		const { cause, context } = options;

		super(message, { cause });
		this.name = this.constructor.name;
		this.context = context;
	}
}

// returns the name of the unmodified table for a table reference
const getOutputTableName = (table: ILoadedTable): string => `${table.sourceTableName}-output`;

// post processing SQL query that parses extra columns from GoogleBenchmark name column
const getExperimentRewriteQuerty = (tableName: string): string => `
	ALTER TABLE "${tableName}" ADD COLUMN family TEXT;
	ALTER TABLE "${tableName}" ADD COLUMN mode TEXT;
	ALTER TABLE "${tableName}" ADD COLUMN vectorization TEXT;
	ALTER TABLE "${tableName}" ADD COLUMN fixture TEXT;
	ALTER TABLE "${tableName}" ADD COLUMN s FLOAT;
	ALTER TABLE "${tableName}" ADD COLUMN n_threads INTEGER;
	ALTER TABLE "${tableName}" ADD COLUMN n_partitions INTEGER;
	ALTER TABLE "${tableName}" ADD COLUMN n_elements_build INTEGER;
	ALTER TABLE "${tableName}" ADD COLUMN n_elements_lookup INTEGER;
	ALTER TABLE "${tableName}" ADD COLUMN shared_elements FLOAT;
	ALTER TABLE "${tableName}" ADD COLUMN construction_throughput FLOAT;
	ALTER TABLE "${tableName}" ADD COLUMN lookup_throughput FLOAT;

	WITH SplitValues AS (
		SELECT
		name,
		SPLIT_PART(name, '_', 1) AS family,
		SPLIT_PART(name, '_', 2) AS mode,
		SPLIT_PART(name, '_', 4) AS vectorization,
		SPLIT_PART(name, '/', 2) AS fixture,
		CAST(SPLIT_PART(name, '/', 3) AS FLOAT) / 100 AS s,
		CAST(SPLIT_PART(name, '/', 4) AS INTEGER) AS n_threads,
		CAST(SPLIT_PART(name, '/', 5) AS INTEGER) AS n_partitions,
		CAST(SPLIT_PART(name, '/', 6) AS INTEGER) AS n_elements_build,
		CAST(SPLIT_PART(name, '/', 7) AS INTEGER) AS n_elements_lookup,
		CAST(SPLIT_PART(name, '/', 8) AS FLOAT) / 100 AS shared_elements
		FROM "${tableName}")
	UPDATE "${tableName}" AS t
		SET
			family = sv.family,
			mode = sv.mode,
			vectorization = sv.vectorization,
			fixture = sv.fixture,
			s = sv.s,
			n_threads = sv.n_threads,
			n_partitions = sv.n_partitions,
			n_elements_build = sv.n_elements_build,
			n_elements_lookup = sv.n_elements_lookup,
	shared_elements = sv.shared_elements
	FROM SplitValues AS sv
	WHERE t.name = sv.name;

	UPDATE "${tableName}"
	SET "construction_throughput" = (n_elements_build * 1000.0) / real_time
	WHERE real_time IS NOT NULL AND real_time != 0;

	UPDATE "${tableName}" as t
		SET fpr = 'NaN'
		WHERE fpr = -1;
		`;

export const dataStorePostProcessingExtension = (
	store: BaseStoreType,
	dataStore: Writable<IDataStore>
) => {
	const deleteTable = (tableName: string) => store.executeQuery(`DROP TABLE "${tableName}"`);
	const renameTable = (tableName: string, newTableName: string) =>
		store.executeQuery(`ALTER TABLE "${tableName}" RENAME TO "${newTableName}"`);

	// Adds an Id column in the table
	const createIdColumn = async (targetTable: string, info: ILoadedTable) => {
		const replace = info.sourceTableName == targetTable;
		const intermediaryTableName = replace ? `id-inject-${targetTable}-temp` : targetTable;
		const query = `
			CREATE TABLE "${intermediaryTableName}" AS
			SELECT
				ROW_NUMBER() OVER () AS id, *
			FROM "${info.sourceTableName}";
		`;

		await store.executeQuery(query);

		if (replace) {
			await deleteTable(info.sourceTableName);
			await renameTable(intermediaryTableName, info.sourceTableName);
		}
		return true;
	};

	// some default transformations
	const idTransformation: JsTransformation = {
		name: 'Add Row ID',
		type: TransformationType.JS,
		description: 'Adds a row ID for faster query operations',
		method: createIdColumn,
		required: true
	};

	const experimentTransformation: JsTransformation = {
		name: 'Gtest parser',
		type: TransformationType.JS,
		description: 'Splits Gtest name column into relevant values',
		method: async (tableName: string, info: ILoadedTable) => {
			const query = getExperimentRewriteQuerty(tableName);
			await store.executeQuery(query);
			return true;
		},
		required: true
	};

	const processSqlStringLiteral = (
		tableName: string,
		info: ILoadedTable,
		queryTemplate: string
	) => {
		return queryTemplate
			.replaceAll(/\${tableName}/g, tableName)
			.replaceAll(/\${sourceTableName}/g, info.sourceTableName);
	};

	const applyPostProcessing = async (table: ILoadedTable) => {
		// clear output table
		if (table.sourceTableName != table.tableName) {
			await deleteTable(table.tableName);
		}

		const outputTableName = getOutputTableName(table);
		// ensure we at least add ID injection
		if (
			typeof table.sourceSchema['id'] === 'undefined' &&
			table.transformations.indexOf(idTransformation) === -1
		) {
			table.transformations.push(idTransformation);
		}

		// handle internal database rewrites
		// TODO: we should probably add a mixed or pure type to ILoadedTable to check if refs have same sourcetype
		if (
			table.refs[0].source === TableSource.BUILD_IN &&
			table.transformations.indexOf(experimentTransformation) === -1
		) {
			if (table.sourceTableName.indexOf('count') !== -1) {
				table.transformations.push(experimentTransformation);
			}
		}

		table.tableName = outputTableName;

		for (const transformation of table.transformations) {
			try {
				switch (transformation.type) {
					case TransformationType.JS:
						await transformation.method(outputTableName, table);
						break;

					case TransformationType.SQL:
						const query = processSqlStringLiteral(table.tableName, table, transformation.query);
						await store.executeQuery(query);
						break;
				}

				// NOTE: remove if this becomes an issue
				// collect intermediary table schemas
				transformation.resultSchema = await store.getTableSchema(table.tableName);
			} catch (err) {
				console.error(err);
				throw new PostProeccingError('Transformation failed', {
					cause: err,
					context: {
						transformationName: transformation.name,
						type: transformation.type,
						sourceTableName: table.sourceTableName
					}
				});
			}
		}

		table.schema = await store.getTableSchema(table.tableName);

		// trigger UI-update
		store.update((state) => state);
	};

	const addPostProcessingTransformer = async (
		table: ILoadedTable,
		transformer: TableTransformation
	) => {
		store.setIsLoading(true);
		table.transformations.push(transformer);
		try {
			await applyPostProcessing(table);
		} catch (err) {
			if (err instanceof PostProeccingError) {
				notificationStore.error({
					message: err.name,
					description: err.message
				});
			}
			return err;
		} finally {
			store.setIsLoading(false);
		}
	};

	const removePostProcessingTransformer = async (
		table: ILoadedTable,
		transformer: TableTransformation
	) => {
		store.setIsLoading(true);
		table.transformations = table.transformations.filter((tr) => tr !== transformer);
		try {
			await applyPostProcessing(table);
		} catch (err) {
			if (err instanceof PostProeccingError) {
				notificationStore.error({
					message: err.name,
					description: err.message
				});
			}
			return err;
		} finally {
			store.setIsLoading(false);
		}
	};

	return {
		createIdColumn,
		applyPostProcessing,
		addPostProcessingTransformer,
		removePostProcessingTransformer
	};
};
