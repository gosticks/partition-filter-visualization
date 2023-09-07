import type { Subscriber, Writable } from 'svelte/store';

export const defaultLogOptions = {
	color: 'blue'
};

export const withLogMiddleware = <S extends object>(
	store: Writable<S>,
	name: string,
	options: typeof defaultLogOptions = defaultLogOptions
) => {
	const log: Subscriber<S> = (state: S) => {
		console.debug(`%c[${name}]`, `color: ${options.color}`, { state });
	};

	store.subscribe(log);

	return store;
};
