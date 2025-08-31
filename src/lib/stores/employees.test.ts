import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { employees } from './employees.js';

// Mock fetch
global.fetch = vi.fn();

const mockEmployeesResponse = {
	employees: [
		{
			id: 1,
			name: 'João Silva',
			abbreviation: 'JS',
			email: 'joao@test.com',
			phone: '(11) 99999-9999',
			phone2: '(11) 88888-8888',
			address: 'Rua A, 123',
			number: '123',
			complement: 'Apto 1',
			neighborhood: 'Centro',
			city: 'São Paulo',
			state: 'SP',
			zipCode: '01234567',
			documentNumber: '123.456.789-00',
			position: 'Gerente',
			hireDate: '2023-01-15T00:00:00.000Z',
			dismissalDate: null,
			active: true,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		}
	],
	pagination: {
		page: 1,
		limit: 10,
		total: 1,
		pages: 1
	}
};

describe('employees store', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset store state
		employees.clearError();
	});

	describe('fetch', () => {
		it('should fetch employees successfully', async () => {
			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockEmployeesResponse)
			});

			await employees.fetch();

			const state = get(employees);
			expect(state.employees).toEqual(mockEmployeesResponse.employees);
			expect(state.pagination).toEqual(mockEmployeesResponse.pagination);
			expect(state.loading).toBe(false);
			expect(state.error).toBe(null);
		});

		it('should handle search parameters', async () => {
			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockEmployeesResponse)
			});

			await employees.fetch({ search: 'João', page: 2, limit: 5 });

			expect(fetch).toHaveBeenCalledWith('/api/employees?search=Jo%C3%A3o&page=2&limit=5');
		});

		it('should handle fetch errors', async () => {
			(fetch as any).mockResolvedValueOnce({
				ok: false,
				json: () => Promise.resolve({ error: 'Server error' })
			});

			await employees.fetch();

			const state = get(employees);
			expect(state.error).toBe('Server error');
			expect(state.loading).toBe(false);
		});

		it('should handle network errors', async () => {
			(fetch as any).mockRejectedValueOnce(new Error('Network error'));

			await employees.fetch();

			const state = get(employees);
			expect(state.error).toBe('Erro de conexão');
			expect(state.loading).toBe(false);
		});
	});

	describe('create', () => {
		const newEmployeeData = {
			name: 'Maria Santos',
			abbreviation: 'MS',
			email: 'maria@test.com',
			phone: '(11) 98765-4321',
			phone2: '(11) 87654-3210',
			address: 'Av. Principal',
			number: '456',
			complement: 'Sala 10',
			neighborhood: 'Centro',
			city: 'São Paulo',
			state: 'SP',
			zipCode: '01234567',
			documentNumber: '987.654.321-00',
			position: 'Vendedora',
			hireDate: '2023-03-01'
		};

		it('should create employee successfully', async () => {
			const createdEmployee = { id: 2, ...newEmployeeData };

			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(createdEmployee)
			});

			const result = await employees.create(newEmployeeData);

			expect(result.success).toBe(true);
			expect(result.employee).toEqual(createdEmployee);

			expect(fetch).toHaveBeenCalledWith('/api/employees', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newEmployeeData)
			});
		});

		it('should handle creation errors', async () => {
			(fetch as any).mockResolvedValueOnce({
				ok: false,
				json: () => Promise.resolve({ error: 'Validation error' })
			});

			const result = await employees.create(newEmployeeData);

			expect(result.success).toBe(false);
			expect(result.error).toBe('Validation error');
		});

		it('should handle network errors', async () => {
			(fetch as any).mockRejectedValueOnce(new Error('Network error'));

			const result = await employees.create(newEmployeeData);

			expect(result.success).toBe(false);
			expect(result.error).toBe('Erro de conexão');
		});
	});

	describe('update', () => {
		const updateData = { name: 'João Silva Atualizado' };

		it('should update employee successfully', async () => {
			const updatedEmployee = { ...mockEmployeesResponse.employees[0], ...updateData };

			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(updatedEmployee)
			});

			const result = await employees.update(1, updateData);

			expect(result.success).toBe(true);
			expect(result.employee).toEqual(updatedEmployee);

			expect(fetch).toHaveBeenCalledWith('/api/employees/1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updateData)
			});
		});

		it('should handle update errors', async () => {
			(fetch as any).mockResolvedValueOnce({
				ok: false,
				json: () => Promise.resolve({ error: 'Update error' })
			});

			const result = await employees.update(1, updateData);

			expect(result.success).toBe(false);
			expect(result.error).toBe('Update error');
		});
	});

	describe('delete', () => {
		it('should delete employee successfully', async () => {
			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ success: true })
			});

			const result = await employees.delete(1);

			expect(result.success).toBe(true);

			expect(fetch).toHaveBeenCalledWith('/api/employees/1', {
				method: 'DELETE'
			});
		});

		it('should handle delete errors', async () => {
			(fetch as any).mockResolvedValueOnce({
				ok: false,
				json: () => Promise.resolve({ error: 'Delete error' })
			});

			const result = await employees.delete(1);

			expect(result.success).toBe(false);
			expect(result.error).toBe('Delete error');
		});
	});

	describe('clearError', () => {
		it('should clear error state', () => {
			employees.clearError();

			const state = get(employees);
			expect(state.error).toBe(null);
		});
	});
});