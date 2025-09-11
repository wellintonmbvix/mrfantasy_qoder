import { writable } from 'svelte/store';

export interface Notification {
	id: string;
	message: string;
	type: 'success' | 'error' | 'warning' | 'info';
	duration?: number;
}

function createNotificationStore() {
	const { subscribe, set, update } = writable<Notification[]>([]);

	const store = {
		subscribe,
		add: (notification: Omit<Notification, 'id'>) => {
			const id = Math.random().toString(36).substr(2, 9);
			const newNotification = { ...notification, id };
			
			console.log('🔔 Adicionando notificação:', newNotification);
			update(notifications => {
				console.log('📝 Notificações antes:', notifications);
				const updatedNotifications = [...notifications, newNotification];
				console.log('📝 Notificações depois:', updatedNotifications);
				return updatedNotifications;
			});

			// Auto-remove after duration (default: 5 seconds)
			if (notification.duration !== 0) {
				setTimeout(() => {
					console.log('🗑️ Removendo notificação:', id);
					update(notifications => notifications.filter(n => n.id !== id));
				}, notification.duration || 5000);
			}

			return id;
		},
		remove: (id: string) => {
			update(notifications => notifications.filter(n => n.id !== id));
		},
		clear: () => {
			set([]);
		}
	};

	return {
		...store,
		success: (message: string, duration?: number) => {
			return store.add({ message, type: 'success', duration });
		},
		error: (message: string, duration?: number) => {
			return store.add({ message, type: 'error', duration });
		},
		warning: (message: string, duration?: number) => {
			return store.add({ message, type: 'warning', duration });
		},
		info: (message: string, duration?: number) => {
			return store.add({ message, type: 'info', duration });
		}
	};
}

export const notificationStore = createNotificationStore();