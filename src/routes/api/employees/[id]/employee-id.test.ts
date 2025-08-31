import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, PUT, DELETE } from './+server.js';
import { prisma } from '$lib/server/database.js';

// Mock the database
const mockEmployee = {
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
	hireDate: new Date('2023-01-15'),
	dismissalDate: null,
	active: true,
	createdAt: new Date(),
	updatedAt: new Date()
};

vi.mock('$lib/server/database.js', () => ({
	prisma: {
		employee: {
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			update: vi.fn()
		}
	}
}));

describe('/api/employees/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET', () => {
		it('should return employee by id', async () => {
			const mockRequest = {
				params: { id: '1' }
			};

			(prisma.employee.findUnique as any).mockResolvedValue(mockEmployee);

			const response = await GET(mockRequest as any);
			const responseData = await response.json();

			expect(response.status).toBe(200);
			expect(responseData).toEqual(mockEmployee);
		});

		it('should return 404 if employee not found', async () => {
			const mockRequest = {
				params: { id: '999' }
			};

			(prisma.employee.findUnique as any).mockResolvedValue(null);

			const response = await GET(mockRequest as any);

			expect(response.status).toBe(404);
			const responseData = await response.json();
			expect(responseData.error).toBe('Funcionário não encontrado');
		});

		it('should handle database errors', async () => {
			const mockRequest = {
				params: { id: '1' }
			};

			(prisma.employee.findUnique as any).mockRejectedValue(new Error('Database error'));

			const response = await GET(mockRequest as any);

			expect(response.status).toBe(500);
			const responseData = await response.json();
			expect(responseData.error).toBe('Erro ao buscar funcionário');
		});
	});

	describe('PUT', () => {
		const validUpdateData = {
			name: 'João Silva Atualizado',
			position: 'Gerente Sênior'
		};

		it('should update employee successfully', async () => {
			const mockRequest = {
				params: { id: '1' },
				json: vi.fn().mockResolvedValue(validUpdateData)
			};

			const updatedEmployee = { ...mockEmployee, ...validUpdateData };

			(prisma.employee.findFirst as any).mockResolvedValue(null);
			(prisma.employee.update as any).mockResolvedValue(updatedEmployee);

			const response = await PUT(mockRequest as any);

			expect(response.status).toBe(200);
			const responseData = await response.json();
			expect(responseData).toEqual(updatedEmployee);
		});

		it('should handle date fields correctly', async () => {
			const updateDataWithDates = {
				...validUpdateData,
				hireDate: '2023-02-01',
				dismissalDate: '2024-01-15'
			};

			const mockRequest = {
				params: { id: '1' },
				json: vi.fn().mockResolvedValue(updateDataWithDates)
			};

			(prisma.employee.findFirst as any).mockResolvedValue(null);
			(prisma.employee.update as any).mockResolvedValue(mockEmployee);

			await PUT(mockRequest as any);

			expect(prisma.employee.update).toHaveBeenCalledWith({
				where: { id: 1 },
				data: {
					...validUpdateData,
					hireDate: new Date('2023-02-01'),
					dismissalDate: new Date('2024-01-15')
				}
			});
		});

		it('should reject duplicate email', async () => {
			const updateData = { email: 'existing@test.com' };
			const mockRequest = {
				params: { id: '1' },
				json: vi.fn().mockResolvedValue(updateData)
			};

			(prisma.employee.findFirst as any).mockResolvedValue({ id: 2, email: 'existing@test.com' });

			const response = await PUT(mockRequest as any);

			expect(response.status).toBe(400);
			const responseData = await response.json();
			expect(responseData.error).toBe('Funcionário com este email ou documento já existe');
		});

		it('should validate fields', async () => {
			const invalidData = { email: 'invalid-email' };
			const mockRequest = {
				params: { id: '1' },
				json: vi.fn().mockResolvedValue(invalidData)
			};

			const response = await PUT(mockRequest as any);

			expect(response.status).toBe(400);
			const responseData = await response.json();
			expect(responseData.error).toBe('Dados inválidos');
		});

		it('should handle database errors', async () => {
			const mockRequest = {
				params: { id: '1' },
				json: vi.fn().mockResolvedValue(validUpdateData)
			};

			(prisma.employee.findFirst as any).mockResolvedValue(null);
			(prisma.employee.update as any).mockRejectedValue(new Error('Database error'));

			const response = await PUT(mockRequest as any);

			expect(response.status).toBe(500);
			const responseData = await response.json();
			expect(responseData.error).toBe('Erro ao atualizar funcionário');
		});
	});

	describe('DELETE', () => {
		it('should deactivate employee successfully', async () => {
			const mockRequest = {
				params: { id: '1' }
			};

			(prisma.employee.update as any).mockResolvedValue({ ...mockEmployee, active: false });

			const response = await DELETE(mockRequest as any);

			expect(response.status).toBe(200);
			const responseData = await response.json();
			expect(responseData.success).toBe(true);

			expect(prisma.employee.update).toHaveBeenCalledWith({
				where: { id: 1 },
				data: { active: false }
			});
		});

		it('should handle database errors', async () => {
			const mockRequest = {
				params: { id: '1' }
			};

			(prisma.employee.update as any).mockRejectedValue(new Error('Database error'));

			const response = await DELETE(mockRequest as any);

			expect(response.status).toBe(500);
			const responseData = await response.json();
			expect(responseData.error).toBe('Erro ao desativar funcionário');
		});
	});
});