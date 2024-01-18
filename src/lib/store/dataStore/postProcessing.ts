import { get, type Writable } from 'svelte/store';
import type { BaseStoreType } from './DataStore';
import {
	TransformationType,
	type IDataStore,
	type ILoadedTable,
	TableSource,
	type TableTransformation,
	type JsTransformation,
	type TableSchema,
	type SqlTransformation
} from './types';
import notificationStore from '../notificationStore';
import { PostProeccingError } from './errors';
import { base } from '$app/paths';

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

	const computeCombinedTableSchema = (
		onlyCheckFields: string[] | undefined = undefined
	): TableSchema => {
		const { tables } = get(dataStore);
		return Object.entries(tables).reduce((acc, [name, value], idx) => {
			console.log('checking table', { name, value });
			if (idx === 0) {
				acc = value.schema;
				return acc;
			}

			Object.entries(acc).forEach(([key, val]) => {
				if (onlyCheckFields !== undefined && !onlyCheckFields.includes(key)) {
					return;
				}

				// Check if key exists in other table
				if (!value.schema[key]) {
					delete acc[key];
					return;
				}

				// Check if type matches
				if (val !== value.schema[key]) {
					delete acc[key];
					return;
				}
			});

			return acc;
		}, {} as TableSchema);
	};

	// some default transformations
	const idTransformation: JsTransformation = {
		name: 'Add Row ID',
		type: TransformationType.JS,
		description: 'Adds a row ID for faster query operations',
		method: createIdColumn,
		required: true
	};

	const constructTransformation: SqlTransformation = {
		name: 'Gtest parser (Construct)',
		type: TransformationType.SQL,
		description: 'Splits Gtest name column into relevant values',
		query: () => fetch(base + '/transformations/construct.sql').then((resp) => resp.text()),
		required: true
	};

	const countTransformation: SqlTransformation = {
		name: 'Gtest parser (Count)',
		type: TransformationType.SQL,
		description: 'Splits Gtest name column into relevant values',
		query: () => fetch(base + '/transformations/count.sql').then((resp) => resp.text()),
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

	const getAnyValue = async (table: ILoadedTable) => {
		const query = `SELECT name FROM "${table.sourceTableName}" LIMIT 1`;
		return store.executeQuery(query);
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

		console.log('Applying post processing', table);

		// handle internal database rewrites
		if (
			table.refs[0].source === TableSource.BUILD_IN &&
			table.transformations.indexOf(countTransformation) === -1 &&
			table.transformations.indexOf(constructTransformation) === -1
		) {
			// Check for fixture in name
			const someValue = await getAnyValue(table);
			if (someValue) {
				const value = someValue.toArray().at(0);
				if (value && value['name']) {
					const name = (value['name'] as string).toLowerCase();
					if (name.includes('construct')) {
						table.transformations.push(constructTransformation);
					} else if (name.includes('count')) {
						table.transformations.push(countTransformation);
					}
				}
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
						let queryString =
							typeof transformation.query === 'string'
								? transformation.query
								: await transformation.query();
						const query = processSqlStringLiteral(table.tableName, table, queryString);
						await store.executeQuery(query);
						break;
				}

				// NOTE: remove if this becomes an issue
				// collect intermediary table schemas
				transformation.resultSchema = await store.getTableSchema(table.tableName);
				transformation.lastError = undefined;
			} catch (err) {
				let error = new PostProeccingError('Transformation failed', {
					cause: err,
					context: {
						transformationName: transformation.name,
						type: transformation.type,
						sourceTableName: table.sourceTableName
					}
				});
				transformation.lastError = error;
				throw error;
			}
		}

		table.schema = await store.getTableSchema(table.tableName);

		store.update((state) => {
			// find and update table schema
			// console.log('current store entry', state.tables[table.tableName], state.tables);

			const combinedSchema = computeCombinedTableSchema();
			console.log({ combinedSchema });
			state.combinedSchema = combinedSchema;
			return state;
		});
	};
	const updatePostProcessingTransformer = async (
		table: ILoadedTable,
		transformer: TableTransformation
	) => {
		store.setIsLoading(true);

		const index = table.transformations.indexOf(transformer);
		if (index == -1) {
			notificationStore.error({ message: 'Could not find transformer for update' });
		}

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
		updatePostProcessingTransformer,
		addPostProcessingTransformer,
		removePostProcessingTransformer
	};
};

// returns the name of the unmodified table for a table reference
const getOutputTableName = (table: ILoadedTable): string => `${table.sourceTableName}-output`;
