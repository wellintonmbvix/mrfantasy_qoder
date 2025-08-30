import { writable } from 'svelte/store';

interface Customer {
	id: number;
	name: string;
	email: string;
	phone: string;
	address: string;
	documentNumber: string;
	createdAt: string;
	updatedAt: string;
	active: boolean;
}

interface CustomersState {
	customers: Customer[];
	loading: boolean;
	error: string | null;
	pagination: {
		page: number;
		limit: number;
		total: number;
		pages: number;
	} | null;
}

function createCustomersStore() {
	const { subscribe, set, update } = writable<CustomersState>({
		customers: [],
		loading: false,
		error: null,
		pagination: null
	});

	return {
		subscribe,
		fetch: async (params: { search?: string; page?: number; limit?: number } = {}) => {
			update(state => ({ ...state, loading: true, error: null }));

			try {
				const searchParams = new URLSearchParams();
				if (params.search) searchParams.set('search', params.search);
				if (params.page) searchParams.set('page', params.page.toString());
				if (params.limit) searchParams.set('limit', params.limit.toString());

				const response = await fetch(`/api/customers?${searchParams}`);
				const data = await response.json();

				if (response.ok) {
					update(state => ({
						...state,
						customers: data.customers,
						pagination: data.pagination,
						loading: false
					}));
				} else {
					update(state => ({
						...state,
						error: data.error || 'Erro ao carregar clientes',
						loading: false
					}));
				}
			} catch (error) {
				update(state => ({
					...state,
					error: 'Erro de conexão',
					loading: false
				}));
			}
		},
		create: async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'active'>) => {
			try {
				const response = await fetch('/api/customers', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(customerData)
				});

				const data = await response.json();

				if (response.ok) {
					update(state => ({
						...state,
						customers: [data, ...state.customers]
					}));
					return { success: true, customer: data };
				} else {
					return { success: false, error: data.error };
				}
			} catch (error) {
				return { success: false, error: 'Erro de conexão' };
			}
		},
		update: async (id: number, customerData: Partial<Customer>) => {
			try {
				const response = await fetch(`/api/customers/${id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(customerData)
				});

				const data = await response.json();

				if (response.ok) {
					update(state => ({
						...state,
						customers: state.customers.map(customer =>
							customer.id === id ? data : customer
						)
					}));
					return { success: true, customer: data };
				} else {
					return { success: false, error: data.error };
				}
			} catch (error) {
				return { success: false, error: 'Erro de conexão' };
			}
		},
		delete: async (id: number) => {
			try {
				const response = await fetch(`/api/customers/${id}`, {
					method: 'DELETE'
				});

				if (response.ok) {
					update(state => ({
						...state,
						customers: state.customers.filter(customer => customer.id !== id)
					}));
					return { success: true };
				} else {
					const data = await response.json();
					return { success: false, error: data.error };
				}
			} catch (error) {
				return { success: false, error: 'Erro de conexão' };
			}
		},
		clearError: () => {
			update(state => ({ ...state, error: null }));
		}
	};
}

export const customers = createCustomersStore();