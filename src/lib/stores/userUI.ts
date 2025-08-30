import { writable } from 'svelte/store';

interface UserUIState {
	userForm: {
		show: boolean;
		user: any | null;
	};
}

function createUserUIStore() {
	const { subscribe, set, update } = writable<UserUIState>({
		userForm: {
			show: false,
			user: null
		}
	});

	return {
		subscribe,
		update,
		openUserForm: (user: any = null) => {
			update(state => ({
				...state,
				userForm: { show: true, user }
			}));
		},
		closeUserForm: () => {
			update(state => ({
				...state,
				userForm: { show: false, user: null }
			}));
		}
	};
}

export const uiStore = createUserUIStore();