import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

interface User {
	id: number;
	username: string;
	email: string;
	role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
}

interface AuthState {
	user: User | null;
	loading: boolean;
	error: string | null;
}

// Auth store
function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		user: null,
		loading: false,
		error: null
	});

	return {
		subscribe,
		login: async (email: string, password: string) => {
			update(state => ({ ...state, loading: true, error: null }));

			try {
				const response = await fetch('/api/auth/login', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email, password })
				});

				const data = await response.json();

				if (response.ok) {
					update(state => ({ 
						...state, 
						user: data.user, 
						loading: false 
					}));
					return { success: true };
				} else {
					update(state => ({ 
						...state, 
						error: data.error, 
						loading: false 
					}));
					return { success: false, error: data.error };
				}
			} catch (error) {
				const errorMessage = 'Erro de conexão';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: false 
				}));
				return { success: false, error: errorMessage };
			}
		},
		logout: async () => {
			try {
				await fetch('/api/auth/logout', { method: 'POST' });
			} catch (error) {
				console.error('Logout error:', error);
			} finally {
				set({ user: null, loading: false, error: null });
			}
		},
		setUser: (user: User | null) => {
			update(state => ({ ...state, user }));
		},
		clearError: () => {
			update(state => ({ ...state, error: null }));
		}
	};
}

export const auth = createAuthStore();

// Derived stores
export const user = derived(auth, $auth => $auth.user);
export const isAuthenticated = derived(auth, $auth => !!$auth.user);
export const isAdmin = derived(auth, $auth => $auth.user?.role === 'ADMIN');
export const isManager = derived(auth, $auth => $auth.user?.role === 'MANAGER' || $auth.user?.role === 'ADMIN');