import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './+server';

// Mock dependencies
vi.mock('$lib/server/database', () => ({
	prisma: {
		customer: {
			findMany: vi.fn(),
			count: vi.fn(),
			create: vi.fn(),
			findFirst: vi.fn()
		}
	}
}));

describe('Customers API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET /api/customers', () => {
		it('should return paginated customers', async () => {
			const mockCustomers = [
				{
					id: 1,
					name: 'João Silva',
					email: 'joao@email.com',
					phone: '(11) 99999-9999',
					address: 'Rua A, 123',
					documentNumber: '123.456.789-01',
					active: true,
					createdAt: new Date(),
					updatedAt: new Date()
				}
			];

			const { prisma } = await import('$lib/server/database');
			vi.mocked(prisma.customer.findMany).mockResolvedValue(mockCustomers as never);
			vi.mocked(prisma.customer.count).mockResolvedValue(1);

			const url = new URL('http://localhost/api/customers?page=1&limit=10');
			const request = new Request(url);
			const locals = { user: { id: 1, role: 'EMPLOYEE' } };

			const response = await GET({ url, locals } as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.customers).toEqual(mockCustomers);
			expect(data.pagination).toEqual({
				page: 1,
				limit: 10,
				total: 1,
				pages: 1
			});
		});

		it('should require authentication', async () => {
			const url = new URL('http://localhost/api/customers');
			const request = new Request(url);
			const locals = {};

			const response = await GET({ url, locals } as any);

			expect(response.status).toBe(401);
		});

		it('should filter customers by search term', async () => {
			const { prisma } = await import('$lib/server/database');
			vi.mocked(prisma.customer.findMany).mockResolvedValue([]);
			vi.mocked(prisma.customer.count).mockResolvedValue(0);

			const url = new URL('http://localhost/api/customers?search=João');
			const locals = { user: { id: 1, role: 'EMPLOYEE' } };

			await GET({ url, locals } as any);

			expect(prisma.customer.findMany).toHaveBeenCalledWith({
				where: {
					AND: [
						{ active: true },
						{
							OR: [
								{ name: { contains: 'João', mode: 'insensitive' } },
								{ email: { contains: 'João', mode: 'insensitive' } },
								{ documentNumber: { contains: 'João' } }
							]
						}
					]
				},
				orderBy: { createdAt: 'desc' },
				skip: 0,
				take: 10
			});
		});
	});

	describe('POST /api/customers', () => {
		it('should create new customer with valid data', async () => {
			const customerData = {
				name: 'Maria Silva',
				email: 'maria@email.com',
				phone: '(11) 88888-8888',
				address: 'Rua B, 456',
				documentNumber: '987.654.321-00'
			};

			const createdCustomer = {
				id: 2,
				...customerData,
				active: true,
				createdAt: new Date(),
				updatedAt: new Date()
			};

			const { prisma } = await import('$lib/server/database');
			vi.mocked(prisma.customer.findFirst).mockResolvedValue(null);
			vi.mocked(prisma.customer.create).mockResolvedValue(createdCustomer as never);

			const request = new Request('http://localhost/api/customers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(customerData)
			});
			const locals = { user: { id: 1, role: 'EMPLOYEE' } };

			const response = await POST({ request, locals } as any);
			const data = await response.json();

			expect(response.status).toBe(201);
			expect(data.customer).toEqual(createdCustomer);
		});

		it('should reject invalid customer data', async () => {
			const invalidData = {
				name: '', // Empty name
				email: 'invalid-email',
				phone: '123',
				address: 'short',
				documentNumber: '123'
			};

			const request = new Request('http://localhost/api/customers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(invalidData)
			});
			const locals = { user: { id: 1, role: 'EMPLOYEE' } };

			const response = await POST({ request, locals } as any);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe('Dados inválidos');
			expect(data.details).toBeDefined();
		});

		it('should reject duplicate email', async () => {
			const customerData = {
				name: 'João Silva',
				email: 'joao@email.com',
				phone: '(11) 99999-9999',
				address: 'Rua A, 123',
				documentNumber: '123.456.789-01'
			};

			const existingCustomer = { id: 1, email: 'joao@email.com' };

			const { prisma } = await import('$lib/server/database');
			vi.mocked(prisma.customer.findFirst).mockResolvedValue(existingCustomer as never);

			const request = new Request('http://localhost/api/customers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(customerData)
			});
			const locals = { user: { id: 1, role: 'EMPLOYEE' } };

			const response = await POST({ request, locals } as any);
			const data = await response.json();

			expect(response.status).toBe(409);
			expect(data.error).toContain('Email já está em uso');
		});

		it('should require authentication', async () => {
			const request = new Request('http://localhost/api/customers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});
			const locals = {};

			const response = await POST({ request, locals } as any);

			expect(response.status).toBe(401);
		});
	});
});