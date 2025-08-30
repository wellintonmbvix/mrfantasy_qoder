import { writable } from 'svelte/store';

// Notification types
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
	id: string;
	type: NotificationType;
	message: string;
	timeout?: number;
}

// UI Store for modals, loading states, notifications
interface UIState {
	notifications: Notification[];
	modals: {
		customerForm: boolean;
		productForm: boolean;
		groupForm: boolean;
		orderForm: boolean;
		deleteConfirm: boolean;
	};
	loading: {
		global: boolean;
		customers: boolean;
		products: boolean;
		orders: boolean;
	};
}

function createUIStore() {
	const { subscribe, set, update } = writable<UIState>({
		notifications: [],
		modals: {
			customerForm: false,
			productForm: false,
			groupForm: false,
			orderForm: false,
			deleteConfirm: false
		},
		loading: {
			global: false,
			customers: false,
			products: false,
			orders: false
		}
	});

	return {
		subscribe,
		// Notifications
		addNotification: (notification: Omit<Notification, 'id'>) => {
			const id = Math.random().toString(36).substr(2, 9);
			const newNotification = { ...notification, id };

			update(state => ({
				...state,
				notifications: [...state.notifications, newNotification]
			}));

			// Auto remove after timeout
			if (notification.timeout !== 0) {
				setTimeout(() => {
					update(state => ({
						...state,
						notifications: state.notifications.filter(n => n.id !== id)
					}));
				}, notification.timeout || 5000);
			}

			return id;
		},
		removeNotification: (id: string) => {
			update(state => ({
				...state,
				notifications: state.notifications.filter(n => n.id !== id)
			}));
		},
		clearNotifications: () => {
			update(state => ({
				...state,
				notifications: []
			}));
		},
		// Modals
		openModal: (modalName: keyof UIState['modals']) => {
			update(state => ({
				...state,
				modals: { ...state.modals, [modalName]: true }
			}));
		},
		closeModal: (modalName: keyof UIState['modals']) => {
			update(state => ({
				...state,
				modals: { ...state.modals, [modalName]: false }
			}));
		},
		closeAllModals: () => {
			update(state => ({
				...state,
				modals: {
					customerForm: false,
					productForm: false,
					groupForm: false,
					orderForm: false,
					deleteConfirm: false
				}
			}));
		},
		// Loading states
		setLoading: (key: keyof UIState['loading'], loading: boolean) => {
			update(state => ({
				...state,
				loading: { ...state.loading, [key]: loading }
			}));
		}
	};
}

export const ui = createUIStore();

// Helper functions for common notifications
export const notify = {
	success: (message: string, timeout?: number) => 
		ui.addNotification({ type: 'success', message, timeout }),
	error: (message: string, timeout?: number) => 
		ui.addNotification({ type: 'error', message, timeout }),
	warning: (message: string, timeout?: number) => 
		ui.addNotification({ type: 'warning', message, timeout }),
	info: (message: string, timeout?: number) => 
		ui.addNotification({ type: 'info', message, timeout })
};