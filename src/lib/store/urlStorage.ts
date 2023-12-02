import { browser } from '$app/environment';
import { type Writable, type Updater, get } from 'svelte/store';

type EncodableTypes = 'string' | 'number' | 'boolean' | 'object';

export const urlEncodeObject = (obj: Record<string, unknown>): string => {
	return btoa(JSON.stringify(obj));
};

export const urlDecodeObject = (str: string): Record<string, unknown> => {
	return JSON.parse(atob(str));
};

export const defaultUrlDecoder = (
	key: string,
	type: EncodableTypes,
	value: string
): unknown | null => {
	switch (type) {
		case 'string':
			return value;
		case 'number':
			return Number(value);
		case 'boolean':
			return value === 'true';
		case 'object':
			return urlDecodeObject(value);
	}
};

export const defaultUrlEncoder = (
	key: string,
	type: EncodableTypes,
	value: unknown
): string | null | undefined => {
	switch (type) {
		case 'string':
			return value as string;
		case 'number':
			return (value as number).toString();
		case 'boolean':
			return (value as boolean).toString();
		case 'object':
			// Filter out empty arrays
			if (Array.isArray(value) && value.length === 0) {
				return null;
			}
			return urlEncodeObject(value as Record<string, unknown>);
	}

	return null;
};

export type UrlDecoder = typeof defaultUrlDecoder;
export type UrlEncoder = typeof defaultUrlEncoder;

export const withSingleKeyUrlStorage = <S>(
	store: Writable<S>,
	key: string,
	encoder: (state: S) => string | null,
	decoder: (value?: string | null) => S
) => {
	// Restore state from storage
	const params = new URLSearchParams(location.search);

	// Set initial store state
	store.set(decoder(params.get(key)));

	const encodeValues = (store: S) => {
		const params = new URLSearchParams(location.search);

		const encodedValue = encoder(store);
		if (encodedValue === null || encodedValue === undefined) {
			params.delete(key);
			return params;
		}
		params.set(key, encodedValue);

		return params;
	};

	// Wrap update with storage functionality
	const oldUpdate = store.update;
	store.update = (updater: Updater<S>) => {
		oldUpdate((state) => {
			const newState = updater(state);
			const params = encodeValues(newState);

			// Check if anything has changed
			if (params.toString() === location.search.slice(1)) {
				return newState;
			}
			history.replaceState(null, '', `${location.pathname}?${params.toString()}`);

			return newState;
		});
	};

	const oldSet = store.set;
	store.set = (state: S) => {
		oldSet(state);
		const newState = get(store);
		const params = encodeValues(newState);
		history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
	};

	return store;
};

export const withUrlStorage = <S extends object, T extends EncodableTypes = EncodableTypes>(
	store: Writable<S>,
	storeKeys: Partial<Record<keyof S, T>>,
	encoder: UrlEncoder = defaultUrlEncoder,
	decoder: UrlDecoder = defaultUrlDecoder
) => {
	if (!browser) {
		return store;
	}

	// Restore state from storage
	const params = new URLSearchParams(location.search);

	const entries = Object.entries(storeKeys) as [keyof S, T][];

	// Set initial store state
	store.update((state) => {
		console.log('[state-decode] restoring state', {initial: state});
		entries.forEach(([key, type]) => {
			const value = params.get(key.toString());

			if (value === null) {
				return;
			}

			// Type cast to unknown to allow dynamic key access
			(state[key] as unknown) = decoder(key.toString(), type, value);
			console.debug('[state-decode] decoding:', {key, paramsValue: value, newState: state[key]});
			return;
		});
		console.log('[state-decode] restored state', {restored: state});
		return state;
	});

	const encodeValues = (store: S) => {
		const params = new URLSearchParams(location.search);
		entries.forEach(([key, type]) => {
			const value = store[key];
			if (value === undefined) {
				params.delete(key.toString());
				return;
			}

			const encodedValue = encoder(key.toString(), type, value);
			if (encodedValue === null || encodedValue === undefined) {
				params.delete(key.toString());
				return;
			}
			params.set(key.toString(), encodedValue);
		});

		return params;
	};

	// Wrap update with storage functionality
	const oldUpdate = store.update;
	store.update = (updater: Updater<S>) => {
		oldUpdate((state) => {
			const newState = updater(state);
			const params = encodeValues(newState);

			// Check if anything has changed
			if (params.toString() === location.search.slice(1)) {
				return newState;
			}
			history.replaceState(null, '', `${location.pathname}?${params.toString()}`);

			return newState;
		});
	};

	const oldSet = store.set;
	store.set = (state: S) => {
		oldSet(state);
		const newState = get(store);
		const params = encodeValues(newState);
		history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
	};

	return store;
};
