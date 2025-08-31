import { writable } from 'svelte/store';

interface Employee {
	id: number;
	name: string;
	abbreviation: string;
	email: string;
	phone: string;
	phone2?: string;
	address: string;
	number: string;
	complement?: string;
	neighborhood: string;
	city: string;
	state: string;
	zipCode: string;
	documentNumber: string;
	position: string;
	hireDate: string;
	dismissalDate?: string;
	createdAt: string;
	updatedAt: string;
	active: boolean;
}

interface EmployeesState {
	employees: Employee[];
	loading: boolean;
	error: string | null;
	pagination: {
		page: number;
		limit: number;
		total: number;
		pages: number;
	} | null;
}

function createEmployeesStore() {
	const { subscribe, set, update } = writable<EmployeesState>({
		employees: [],
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

				const response = await fetch(`/api/employees?${searchParams}`);
				const data = await response.json();

				if (response.ok) {
					update(state => ({
						...state,
						employees: data.employees,
						pagination: data.pagination,
						loading: false
					}));
				} else {
					update(state => ({
						...state,
						error: data.error || 'Erro ao carregar funcionários',
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
		create: async (employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'active'>) => {
			try {
				const response = await fetch('/api/employees', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(employeeData)
				});

				const data = await response.json();

				if (response.ok) {
					update(state => ({
						...state,
						employees: [data, ...state.employees]
					}));
					return { success: true, employee: data };
				} else {
					return { success: false, error: data.error };
				}
			} catch (error) {
				return { success: false, error: 'Erro de conexão' };
			}
		},
		update: async (id: number, employeeData: Partial<Employee>) => {
			try {
				const response = await fetch(`/api/employees/${id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(employeeData)
				});

				const data = await response.json();

				if (response.ok) {
					update(state => ({
						...state,
						employees: state.employees.map(employee =>
							employee.id === id ? data : employee
						)
					}));
					return { success: true, employee: data };
				} else {
					return { success: false, error: data.error };
				}
			} catch (error) {
				return { success: false, error: 'Erro de conexão' };
			}
		},
		delete: async (id: number) => {
			try {
				const response = await fetch(`/api/employees/${id}`, {
					method: 'DELETE'
				});

				if (response.ok) {
					update(state => ({
						...state,
						employees: state.employees.filter(employee => employee.id !== id)
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

export const employees = createEmployeesStore();