import type { FilterEntry } from '$routes/graph/+page.server';
import type { Readable } from 'svelte/store';

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

export type SimpleGraphFilterOption =
	| (
			| {
					type: 'string';
					options: string[];
					label: string;
			  }
			| {
					type: 'number';
					options: number[];
					label: string;
			  }
			| {
					type: 'boolean';
					label: string;
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
	preloadedTables: { label: string; value: FilterEntry }[];
	// List of available filter options
	// filterOptions: FilterOptions;
	selectedTables: ITableReference[];
	graphOptions?: GraphOptions;
}

export enum TableSource {
	BUILD_IN,
	URL,
	FILE
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
