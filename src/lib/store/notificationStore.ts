import { writable } from 'svelte/store';
import { withLogMiddleware } from './logMiddleware';

export interface INotification {
	id: number;
	message: string;
	description?: string;
	callback?: () => void;
	dismissDuration?: number;
	type: 'success' | 'error' | 'info';
}

// Type for functions that contain type in the function name e.g. error, warn. Convenience such that the
// developer does not have to provide extra arguments
type IKnownTypeNotificationOptions = Pick<
	INotification,
	'message' | 'description' | 'callback' | 'dismissDuration'
>;

const notificationStore = () => {
	const store = withLogMiddleware(writable<INotification[]>([]), 'notificationStore');

	const addNotification = (notification: Omit<INotification, 'id'>) => {
		const notificationInstance = { ...notification, id: Date.now() };
		store.update((notifications) => {
			notifications.push(notificationInstance);
			return notifications;
		});

		return notificationInstance;
	};

	const error = (options: IKnownTypeNotificationOptions) => {
		console.error(options.message);
		return addNotification({ ...options, type: 'error' });
	};
	const info = (options: IKnownTypeNotificationOptions) => {
		return addNotification({ ...options, type: 'info' });
	};
	const success = (options: IKnownTypeNotificationOptions) => {
		return addNotification({ ...options, type: 'success' });
	};

	const removeNotification = (id: number) => {
		store.update((notifications) => {
			return notifications.filter((notification) => notification.id !== id);
		});
	};

	return {
		subscribe: store.subscribe,
		addNotification,
		removeNotification,
		// convenience methods
		error,
		info,
		success
	};
};

export default notificationStore();
