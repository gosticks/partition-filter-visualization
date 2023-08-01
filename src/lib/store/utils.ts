import { getContext, hasContext, setContext } from 'svelte';
import { readable, writable, type StartStopNotifier } from 'svelte/store';

// Based on context handling suggested by https://dev.to/jdgamble555/the-correct-way-to-use-stores-in-sveltekit-3h6i

// context for any type of store
export const useSharedStore = <T, A>(
	name: string,
	fn: (value?: A, startStop?: StartStopNotifier<A>) => T,
	defaultValue?: A,
	startStop?: StartStopNotifier<A>
) => {
	if (hasContext(name)) {
		return getContext<T>(name);
	}
	const _value = fn(defaultValue, startStop);
	setContext(name, _value);
	return _value;
};

// writable store context
export const useWritable = <T>(name: string, value: T, startStop?: StartStopNotifier<T>) =>
	useSharedStore(name, writable, value, startStop);

// readable store context
export const useReadable = <T>(name: string, value: T, startStop?: StartStopNotifier<T>) =>
	useSharedStore(name, readable, value, startStop);
