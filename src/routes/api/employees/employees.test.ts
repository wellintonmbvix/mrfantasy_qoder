import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from './+server.js';
import { prisma } from '$lib/server/database.js';

// Mock the database
const mockEmployees = [
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
		hireDate: new Date('2023-01-15'),
		dismissalDate: null,
		active: true,
		createdAt: new Date(),
		updatedAt: new Date()
	}
];

vi.mock('$lib/server/database.js', () => ({
	prisma: {
		employee: {
			findMany: vi.fn(),
			count: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn()
		}
	}
}));

describe('/api/employees', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET', () => {
		it('should return employees with pagination', async () => {
			const mockRequest = {
				url: new URL('http://localhost:5173/api/employees?page=1&limit=10')
			};

			(prisma.employee.findMany as any).mockResolvedValue(mockEmployees);
			(prisma.employee.count as any).mockResolvedValue(1);

			const response = await GET(mockRequest as any);
			const responseData = await response.json();

			expect(response.status).toBe(200);
			expect(responseData).toEqual({
				employees: mockEmployees,
				pagination: {
					page: 1,
					limit: 10,
					total: 1,
					pages: 1
				}
			});
		});

		it('should handle search parameter', async () => {
			const mockRequest = {
				url: new URL('http://localhost:5173/api/employees?search=João')
			};

			(prisma.employee.findMany as any).mockResolvedValue(mockEmployees);
			(prisma.employee.count as any).mockResolvedValue(1);

			await GET(mockRequest as any);

			expect(prisma.employee.findMany).toHaveBeenCalledWith({
				where: {
					OR: [
						{ name: { contains: 'João' } },
						{ abbreviation: { contains: 'João' } },
						{ email: { contains: 'João' } },
						{ phone: { contains: 'João' } },
						{ phone2: { contains: 'João' } },
						{ documentNumber: { contains: 'João' } },
						{ city: { contains: 'João' } },
						{ neighborhood: { contains: 'João' } },
						{ position: { contains: 'João' } }
					],
					active: true
				},
				skip: 0,
				take: 10,
				orderBy: { createdAt: 'desc' }
			});
		});

		it('should handle database errors', async () => {
			const mockRequest = {
				url: new URL('http://localhost:5173/api/employees')
			};

			(prisma.employee.findMany as any).mockRejectedValue(new Error('Database error'));

			const response = await GET(mockRequest as any);

			expect(response.status).toBe(500);
			const responseData = await response.json();
			expect(responseData.error).toBe('Erro ao buscar funcionários');
		});
	});

	describe('POST', () => {
		const validEmployeeData = {
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
			hireDate: '2023-03-01',
			dismissalDate: null
		};

		it('should create a new employee successfully', async () => {
			const mockRequest = {
				json: vi.fn().mockResolvedValue(validEmployeeData)
			};

			const createdEmployee = { id: 2, ...validEmployeeData, active: true, createdAt: new Date(), updatedAt: new Date() };

			(prisma.employee.findFirst as any).mockResolvedValue(null);
			(prisma.employee.create as any).mockResolvedValue(createdEmployee);

			const response = await POST(mockRequest as any);

			expect(response.status).toBe(201);
			const responseData = await response.json();
			expect(responseData).toEqual(createdEmployee);
		});

		it('should reject duplicate email', async () => {
			const mockRequest = {
				json: vi.fn().mockResolvedValue(validEmployeeData)
			};

			(prisma.employee.findFirst as any).mockResolvedValue(mockEmployees[0]);

			const response = await POST(mockRequest as any);

			expect(response.status).toBe(400);
			const responseData = await response.json();
			expect(responseData.error).toBe('Funcionário com este email ou documento já existe');
		});

		it('should validate required fields', async () => {
			const invalidData = { name: '', email: 'invalid-email' };
			const mockRequest = {
				json: vi.fn().mockResolvedValue(invalidData)
			};

			const response = await POST(mockRequest as any);

			expect(response.status).toBe(400);
			const responseData = await response.json();
			expect(responseData.error).toBe('Dados inválidos');
			expect(responseData.details).toBeDefined();
		});

		it('should handle database errors', async () => {
			const mockRequest = {
				json: vi.fn().mockResolvedValue(validEmployeeData)
			};

			(prisma.employee.findFirst as any).mockResolvedValue(null);
			(prisma.employee.create as any).mockRejectedValue(new Error('Database error'));

			const response = await POST(mockRequest as any);

			expect(response.status).toBe(500);
			const responseData = await response.json();
			expect(responseData.error).toBe('Erro ao criar funcionário');
		});
	});
});