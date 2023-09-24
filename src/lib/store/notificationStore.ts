import { writable } from 'svelte/store';
import { withLogMiddleware } from './logMiddleware';

export enum NotificationType {
	info,
	success,
	error
}

export interface INotification {
	id: number;
	message: string;
	description?: string;
	callback?: () => void;
	callbackLabel?: string;
	dismissDuration?: number;
	type: NotificationType;
}

// Type for functions that contain type in the function name e.g. error, warn. Convenience such that the
// developer does not have to provide extra arguments
type IKnownTypeNotificationOptions = Pick<
	INotification,
	'message' | 'description' | 'callback' | 'dismissDuration'
>;

// Old notifications will be removed if this number is reached
const maxNotificationDisplay = 5;

const notificationStore = () => {
	const store = withLogMiddleware(writable<INotification[]>([]), 'notificationStore');

	const addNotification = (notification: Omit<INotification, 'id'>) => {
		const notificationInstance = { ...notification, id: Date.now() };
		store.update((notifications) => {
			if (notifications.length === maxNotificationDisplay) {
				notifications.shift();
			}

			notifications.push(notificationInstance);
			return notifications;
		});

		return notificationInstance;
	};

	const error = (options: IKnownTypeNotificationOptions) => {
		console.error(options.message);
		return addNotification({ ...options, type: NotificationType.error });
	};
	const info = (options: IKnownTypeNotificationOptions) => {
		return addNotification({ ...options, type: NotificationType.info });
	};
	const success = (options: IKnownTypeNotificationOptions) => {
		return addNotification({ ...options, type: NotificationType.success });
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
