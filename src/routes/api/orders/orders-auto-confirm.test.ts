import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from './+server.js';
import { prisma } from '$lib/server/database.js';

// Mock do prisma
vi.mock('$lib/server/database.js', () => ({
	prisma: {
		order: {
			count: vi.fn(),
			create: vi.fn(),
			findUnique: vi.fn()
		},
		product: {
			findUnique: vi.fn()
		},
		paymentMethod: {
			findUnique: vi.fn()
		},
		$transaction: vi.fn()
	}
}));

describe('API Orders - Auto Confirm Sale Orders', () => {
	const mockLocals = {
		user: { id: 1 }
	};

	const mockProduct = {
		id: 1,
		name: 'Produto Teste',
		active: true,
		stockQuantity: 10,
		availableForRental: true,
		availableForSale: true
	};

	const mockPaymentMethod = {
		id: 1,
		name: 'Dinheiro',
		active: true
	};

	beforeEach(() => {
		vi.clearAllMocks();
		
		// Mock dos métodos do prisma
		(prisma.order.count as any).mockResolvedValue(5);
		(prisma.product.findUnique as any).mockResolvedValue(mockProduct);
		(prisma.paymentMethod.findUnique as any).mockResolvedValue(mockPaymentMethod);
		(prisma.order.findUnique as any).mockResolvedValue({
			id: 1,
			orderNumber: 'ORD-000006',
			status: 'CONFIRMED',
			subtotalAmount: 100,
			totalAmount: 100,
			discountValue: null,
			orderItems: [],
			orderPayments: []
		});
	});

	it('deve marcar pedido como CONFIRMED quando todos os itens são SALE', async () => {
		const orderData = {
			attendantId: 1,
			orderType: 'SALE',
			orderDate: '2025-09-04T10:00:00Z',
			items: [
				{
					productId: 1,
					quantity: 1,
					unitPrice: 50,
					itemType: 'SALE'
				},
				{
					productId: 1,
					quantity: 1,
					unitPrice: 50,
					itemType: 'SALE'
				}
			],
			payments: [
				{
					paymentMethodId: 1,
					amount: 100
				}
			]
		};

		let capturedOrderData: any = null;

		// Mock da transação para capturar os dados do pedido
		(prisma.$transaction as any).mockImplementation(async (callback: any) => {
			const mockTx = {
				order: {
					create: vi.fn().mockImplementation((data) => {
						capturedOrderData = data;
						return { id: 1 };
					})
				},
				orderItem: { create: vi.fn() },
				product: { update: vi.fn() },
				inventoryLog: { create: vi.fn() },
				orderPayment: { create: vi.fn() }
			};
			
			return await callback(mockTx);
		});

		const request = {
			json: () => Promise.resolve(orderData)
		};

		const response = await POST({ request, locals: mockLocals } as any);
		const result = await response.json();

		expect(response.status).toBe(201);
		expect(capturedOrderData.data.status).toBe('CONFIRMED');
	});

	it('deve marcar pedido como PENDING quando tem itens RENTAL', async () => {
		const orderData = {
			customerId: 1,
			attendantId: 1,
			orderType: 'RENTAL',
			orderDate: '2025-09-04T10:00:00Z',
			rentalStartDate: '2025-09-05T10:00:00Z',
			rentalEndDate: '2025-09-07T10:00:00Z',
			items: [
				{
					productId: 1,
					quantity: 1,
					unitPrice: 50,
					itemType: 'RENTAL'
				},
				{
					productId: 1,
					quantity: 1,
					unitPrice: 50,
					itemType: 'SALE'
				}
			],
			payments: [
				{
					paymentMethodId: 1,
					amount: 100
				}
			]
		};

		let capturedOrderData: any = null;

		// Mock da transação para capturar os dados do pedido
		(prisma.$transaction as any).mockImplementation(async (callback: any) => {
			const mockTx = {
				order: {
					create: vi.fn().mockImplementation((data) => {
						capturedOrderData = data;
						return { id: 1 };
					})
				},
				orderItem: { create: vi.fn() },
				product: { update: vi.fn() },
				inventoryLog: { create: vi.fn() },
				orderPayment: { create: vi.fn() }
			};
			
			return await callback(mockTx);
		});

		const request = {
			json: () => Promise.resolve(orderData)
		};

		const response = await POST({ request, locals: mockLocals } as any);
		const result = await response.json();

		expect(response.status).toBe(201);
		expect(capturedOrderData.data.status).toBe('PENDING');
	});

	it('deve marcar pedido como PENDING quando tem apenas itens RENTAL', async () => {
		const orderData = {
			customerId: 1,
			attendantId: 1,
			orderType: 'RENTAL',
			orderDate: '2025-09-04T10:00:00Z',
			rentalStartDate: '2025-09-05T10:00:00Z',
			rentalEndDate: '2025-09-07T10:00:00Z',
			items: [
				{
					productId: 1,
					quantity: 1,
					unitPrice: 50,
					itemType: 'RENTAL'
				}
			],
			payments: [
				{
					paymentMethodId: 1,
					amount: 50
				}
			]
		};

		let capturedOrderData: any = null;

		// Mock da transação para capturar os dados do pedido
		(prisma.$transaction as any).mockImplementation(async (callback: any) => {
			const mockTx = {
				order: {
					create: vi.fn().mockImplementation((data) => {
						capturedOrderData = data;
						return { id: 1 };
					})
				},
				orderItem: { create: vi.fn() },
				product: { update: vi.fn() },
				inventoryLog: { create: vi.fn() },
				orderPayment: { create: vi.fn() }
			};
			
			return await callback(mockTx);
		});

		const request = {
			json: () => Promise.resolve(orderData)
		};

		const response = await POST({ request, locals: mockLocals } as any);
		const result = await response.json();

		expect(response.status).toBe(201);
		expect(capturedOrderData.data.status).toBe('PENDING');
	});
});