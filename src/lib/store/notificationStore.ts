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

const notificationStore = () => {
	const store = withLogMiddleware(writable<INotification[]>([]), 'notificationStore');

	const addNotification = (notification: INotification) => {
		store.update((notifications) => {
			notifications.push(notification);
			return notifications;
		});
	};

	const removeNotification = (id: number) => {
		store.update((notifications) => {
			return notifications.filter((notification) => notification.id !== id);
		});
	};

	return {
		subscribe: store.subscribe,
		addNotification,
		removeNotification
	};
};

export default notificationStore();
