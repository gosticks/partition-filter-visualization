import type { GraphRenderer } from '$lib/rendering/GraphRenderer';
import type { FilterEntry } from '$routes/graph/+page.server';
import type { FilterOptions } from '../dataStore/types';

export enum GraphType {
	PLANE = 'plane'
}

export type DeepPartial<T> = {
	[P in keyof T]?: DeepPartial<T[P]>;
};

type Join<K, P> = K extends string | number
	? P extends string | number
		? `${K}.${P}`
		: never
	: never;

export type Paths<T, D extends number = 5> = [D] extends [never]
	? never
	: T extends object
	? {
			[K in keyof T]-?: K extends string | number ? `${K}` | Join<K, Paths<T[K]>> : never;
	  }[keyof T]
	: '';

export type PathValue<T, P extends string> = P extends keyof T
	? T[P]
	: P extends `${infer K}.${infer Rest}`
	? K extends keyof T
		? PathValue<T[K], Rest>
		: never
	: never;

export function setObjectValue<T extends object, P extends Paths<T>>(
	obj: T,
	path: P,
	value: any //PathValue<T, P>
): void {
	const keys = path.split('.');
	let current = obj as any; //as DeepPartial<T>;

	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i];
		if (typeof current[key] !== 'object' || current[key] === null) {
			current[key] = {};
		}
		current = current[key]!;
	}

	current[keys[keys.length - 1]] = value;
}

export abstract class GraphOptions<
	T extends Record<string, unknown> = Record<string, unknown>,
	R extends GraphRenderer = GraphRenderer
> {
	public renderer: R;
	public active = false;
	public filterOptions: FilterOptions;

	constructor(renderer: R, filterOptions: FilterOptions) {
		this.renderer = renderer;
		this.filterOptions = filterOptions;
	}

	public abstract isValid(): boolean;
	public abstract getCurrentOptions(): T;
	public abstract getType(): GraphType;
	public abstract setStateValue<P extends Paths<T>>(path: P, value: PathValue<T, P>): void;
	public abstract applyOptionsIfValid(): Promise<void>;

	public abstract getRenderer(): R;
}

export interface IFilterStore {
	isLoading: boolean;
	preloadedTables: { label: string; value: FilterEntry }[];
	// List of available filter options
	// filterOptions: FilterOptions;
	selectedTables: ITableReference[];
	graphOptions?: GraphOptions;
	selectedPoint?: THREE.Vector3;
}

export enum TableSource {
	BUILD_IN,
	URL,
	FILE
}

export enum DataScaling {
	LINEAR,
	LOG
}

export type ITableReference = {
	name: string;
	tableName: string;
} & (
	| {
			source: TableSource.BUILD_IN | TableSource.URL;
			url: string;
	  }
	| {
			source: TableSource.FILE;
			file: File;
	  }
);
