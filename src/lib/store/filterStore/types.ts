import type { FilterEntry } from '$routes/graph/[slug]/+page.server';
import type { Readable } from 'svelte/store';
import type { Dataset } from '../../../dataset/types';
import type { TableSource } from '../dataStore/types';
import type { IPlaneRenderOptions, IPlaneRendererData } from '$lib/rendering/PlaneRenderer';
import type { IPlaneGraphState } from './graphs/plane';

export enum GraphType {
	PLANE = 'plane'
}

export type DeepPartial<T> = {
	[P in keyof T]?: DeepPartial<T[P]>;
};

// Minimal definition of a loaded table
// omits full file paths
// should be matched agains preloaded dataset at
// init time
export type IMinimalTableRef = {
    refs: {
        source: TableSource;
        // name: string;
		url?: string;
        datasetName?: string; // Only set for source == build_in
    }[]
	tableName: string;
};


export type GraphStateConfig = {
	name?: string,
	description?: string,
	selectedTables: IMinimalTableRef[],
	graphOption?: {
		type: GraphType.PLANE,
		data: IPlaneGraphState,
		renderer: IPlaneRenderOptions,
	}
	ui?: {
		rotation?: {
			x: number,
			y: number,
			z: number
		},
		position?: {
			x: number,
			y: number,
			z: number
		}
	}
}

// Filter options used to render UI components for dynamic configuration
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
	RenderOptions extends Record<string, unknown> = Record<string, unknown>,
	Data = unknown,
	K extends keyof Options = keyof Options,
	RenderKey extends keyof RenderOptions = keyof RenderOptions,
> {
	public filterOptionFields: GraphFilterOptions<Options>;

	constructor(filterOptionFields: GraphFilterOptions<Options>) {
		this.filterOptionFields = filterOptionFields;
	}

	public abstract getType(): GraphType;
	public abstract applyOptionsIfValid(): Promise<void>;
	public abstract reloadFilterOptions(): void;

	public abstract getRenderOptionFields(): GraphFilterOptions<RenderOptions>;
	public abstract setFilterOption(key: K, value: Options[K]): void;
	public abstract setRenderOption(key: RenderKey, value: RenderOptions[RenderKey]): void;

	public abstract dataStore: Readable<Data | undefined>;
	public abstract optionsStore: Readable<Options | undefined>;

	public abstract toStateObject(): {data:Options, render: RenderOptions};

	public abstract description(): string | null;
}

export interface IFilterStore {
	isLoading: boolean;
	preloadedDatasets: Dataset[];
	graphOptions?: GraphOptions;
}
