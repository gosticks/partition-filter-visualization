import type{ Subscriber, Writable } from 'svelte/store';
export const defaultLogOptions = {
	color: 'blue'
};

export const withLogMiddleware = <S extends object>(
	store: Writable<S>,
	name: string,
	options: typeof defaultLogOptions = defaultLogOptions
) => {
	// let oldState: S = JSON.parse(JSON.stringify(sanitizeObject(get(store))));
	const log: Subscriber<S> = (state: S) => {
		// const sanitizedState = sanitizeObject(state);
		// const diff = detailedDiff(oldState, sanitizeObject);
		// oldState = JSON.parse(JSON.stringify(sanitizeObject));
		console.debug(`%c[${name}]`, `color: ${options.color}`, { state });
	};

	store.subscribe(log);

	return store;
};
