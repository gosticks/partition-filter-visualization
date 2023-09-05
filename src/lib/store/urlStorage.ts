import { browser } from '$app/environment';
import type { Writable, Updater } from 'svelte/store';

export const withUrlStorage = <S extends object>(
	store: Writable<S>,
	storeKeys: Partial<Record<keyof S, 'string' | 'number' | 'boolean' | 'object'>>
) => {
	if (!browser) {
		return store;
	}

	// Restore state from storage
	const params = new URLSearchParams(location.search);

	const entries = Object.entries(storeKeys) as [
		keyof S,
		'string' | 'number' | 'boolean' | 'object'
	][];

	// Set initial store state
	store.update((state) => {
		entries.forEach(([key, type]) => {
			const storedValue = params.get(key.toString());
			if (storedValue === null) {
				return;
			}

			switch (type) {
				case 'string':
					(state[key] as string) = storedValue;
					break;
				case 'number':
					(state[key] as number) = Number(storedValue);
					break;
				case 'boolean':
					(state[key] as boolean) = storedValue === 'true';
					break;
				case 'object':
					(state[key] as object) = JSON.parse(atob(storedValue));
					break;
			}
		});
		console.log('Restored state', state);
		return state;
	});

	const encodeValues = (store: S) => {
		const params = new URLSearchParams(location.search);
		entries.forEach(([key, type]) => {
			const value = store[key];
			if (value === undefined) {
				return;
			}
			switch (type) {
				case 'string':
					params.set(key.toString(), value as string);
					break;
				case 'number':
					params.set(key.toString(), (value as number).toString());
					break;
				case 'boolean':
					params.set(key.toString(), (value as boolean).toString());
					break;
				case 'object':
					params.set(key.toString(), btoa(JSON.stringify(value)));
					break;
			}
		});

		return params;
	};

	// Wrap update with storage functionality
	const oldUpdate = store.update;
	store.update = (updater: Updater<S>) => {
		oldUpdate((state) => {
			const newState = updater(state);
			const params = encodeValues(newState);
			history.replaceState(null, '', `${location.pathname}?${params.toString()}`);

			return newState;
		});
	};

	return store;
};
