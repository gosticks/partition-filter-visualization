import type { FilterEntry } from '$routes/graph/+page.server';

export type TableSelectionEvent = CustomEvent<{
	buildInTables?: {
		label: string;
		value: FilterEntry;
	}[];
	externalTables?: {
		fileList?: FileList;
	};
}>;
