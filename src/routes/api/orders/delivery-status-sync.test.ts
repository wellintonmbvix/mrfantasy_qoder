import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PUT } from './[id]/+server';
import { prisma } from '$lib/server/database';

// Mock das dependências
vi.mock('$lib/server/database', () => ({
	prisma: {
		order: {
			findUnique: vi.fn(),
			update: vi.fn()
		},
		orderItem: {
			findMany: vi.fn(),
			update: vi.fn()
		},
		$transaction: vi.fn()
	}
}));

vi.mock('$lib/server/middleware', () => ({
	requireRole: vi.fn().mockReturnValue({ success: true })
}));

describe('Sincronização de Status DELIVERED e itemTaken', () => {
	const mockLocals = {
		user: { id: 1, role: 'ADMIN' }
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('deve marcar todos os itens RENTAL como itemTaken=true quando status muda para DELIVERED', async () => {
		const orderId = 1;
		const mockOrder = {
			id: orderId,
			status: 'CONFIRMED',
			orderItems: [
				{ id: 1, itemType: 'RENTAL', itemTaken: false },
				{ id: 2, itemType: 'RENTAL', itemTaken: false },
				{ id: 3, itemType: 'SALE', itemTaken: true }
			]
		};

		// Mock do pedido atual
		(prisma.order.findUnique as any).mockResolvedValue(mockOrder);

		// Mock da transação
		let capturedRentalUpdates: any[] = [];
		(prisma.$transaction as any).mockImplementation(async (callback: any) => {
			const mockTx = {
				order: {
					update: vi.fn().mockResolvedValue({ ...mockOrder, status: 'DELIVERED' })
				},
				orderItem: {
					findMany: vi.fn().mockResolvedValue([
						{ id: 1, itemType: 'RENTAL', itemTaken: false },
						{ id: 2, itemType: 'RENTAL', itemTaken: false }
					]),
					update: vi.fn().mockImplementation((params) => {
						capturedRentalUpdates.push(params);
						return Promise.resolve();
					})
				}
			};
			
			return await callback(mockTx);
		});

		// Mock da busca final do pedido
		(prisma.order.findUnique as any).mockResolvedValueOnce({
			...mockOrder,
			status: 'DELIVERED',
			customer: null,
			user: { id: 1, username: 'test' },
			attendant: null,
			orderItems: mockOrder.orderItems.map(item => ({
				...item,
				unitPrice: 10,
				totalPrice: 10,
				discountValue: null,
				product: {
					costPrice: 5,
					rentalPrice: 10,
					salePrice: 15
				}
			})),
			orderPayments: [],
			subtotalAmount: 30,
			totalAmount: 30,
			discountValue: null
		});

		const request = {
			json: () => Promise.resolve({ status: 'DELIVERED' })
		};

		const response = await PUT({ 
			params: { id: orderId.toString() }, 
			request, 
			locals: mockLocals 
		} as any);

		expect(response.status).toBe(200);
		
		// Verificar se os itens RENTAL foram atualizados para itemTaken=true
		expect(capturedRentalUpdates).toHaveLength(2);
		expect(capturedRentalUpdates[0].data.itemTaken).toBe(true);
		expect(capturedRentalUpdates[1].data.itemTaken).toBe(true);
	});

	it('deve alterar status para DELIVERED quando todos os itens RENTAL têm itemTaken=true', async () => {
		const orderId = 1;
		const mockOrder = {
			id: orderId,
			status: 'CONFIRMED',
			orderItems: [
				{ id: 1, itemType: 'RENTAL', itemTaken: false },
				{ id: 2, itemType: 'RENTAL', itemTaken: false }
			]
		};

		// Mock do pedido atual
		(prisma.order.findUnique as any).mockResolvedValue(mockOrder);

		let capturedStatusUpdate: any = null;
		(prisma.$transaction as any).mockImplementation(async (callback: any) => {
			const mockTx = {
				order: {
					update: vi.fn().mockImplementation((params) => {
						capturedStatusUpdate = params;
						return Promise.resolve({ ...mockOrder, status: params.data.status || 'CONFIRMED' });
					})
				},
				orderItem: {
					findMany: vi.fn().mockResolvedValue([
						{ id: 1, itemType: 'RENTAL', itemTaken: true },
						{ id: 2, itemType: 'RENTAL', itemTaken: true }
					]),
					update: vi.fn().mockResolvedValue({})
				}
			};
			
			return await callback(mockTx);
		});

		// Mock da busca final do pedido
		(prisma.order.findUnique as any).mockResolvedValueOnce({
			...mockOrder,
			status: 'DELIVERED',
			customer: null,
			user: { id: 1, username: 'test' },
			attendant: null,
			orderItems: mockOrder.orderItems.map(item => ({
				...item,
				unitPrice: 10,
				totalPrice: 10,
				discountValue: null,
				product: {
					costPrice: 5,
					rentalPrice: 10,
					salePrice: 15
				}
			})),
			orderPayments: [],
			subtotalAmount: 20,
			totalAmount: 20,
			discountValue: null
		});

		const request = {
			json: () => Promise.resolve({
				orderItems: [
					{ id: 1, itemTaken: true },
					{ id: 2, itemTaken: true }
				]
			})
		};

		const response = await PUT({ 
			params: { id: orderId.toString() }, 
			request, 
			locals: mockLocals 
		} as any);

		expect(response.status).toBe(200);
		
		// Verificar se o status foi atualizado para DELIVERED automaticamente
		expect(capturedStatusUpdate.data.status).toBe('DELIVERED');
	});

	it('não deve alterar status para DELIVERED se nem todos os itens RENTAL têm itemTaken=true', async () => {
		const orderId = 1;
		const mockOrder = {
			id: orderId,
			status: 'CONFIRMED',
			orderItems: [
				{ id: 1, itemType: 'RENTAL', itemTaken: false },
				{ id: 2, itemType: 'RENTAL', itemTaken: false }
			]
		};

		// Mock do pedido atual
		(prisma.order.findUnique as any).mockResolvedValue(mockOrder);

		let orderUpdateCalls = 0;
		(prisma.$transaction as any).mockImplementation(async (callback: any) => {
			const mockTx = {
				order: {
					update: vi.fn().mockImplementation(() => {
						orderUpdateCalls++;
						return Promise.resolve({ ...mockOrder, status: 'CONFIRMED' });
					})
				},
				orderItem: {
					findMany: vi.fn().mockResolvedValue([
						{ id: 1, itemType: 'RENTAL', itemTaken: true },
						{ id: 2, itemType: 'RENTAL', itemTaken: false } // Um ainda false
					]),
					update: vi.fn().mockResolvedValue({})
				}
			};
			
			return await callback(mockTx);
		});

		// Mock da busca final do pedido
		(prisma.order.findUnique as any).mockResolvedValueOnce({
			...mockOrder,
			status: 'CONFIRMED',
			customer: null,
			user: { id: 1, username: 'test' },
			attendant: null,
			orderItems: mockOrder.orderItems.map(item => ({
				...item,
				unitPrice: 10,
				totalPrice: 10,
				discountValue: null,
				product: {
					costPrice: 5,
					rentalPrice: 10,
					salePrice: 15
				}
			})),
			orderPayments: [],
			subtotalAmount: 20,
			totalAmount: 20,
			discountValue: null
		});

		const request = {
			json: () => Promise.resolve({
				orderItems: [
					{ id: 1, itemTaken: true },
					{ id: 2, itemTaken: false }
				]
			})
		};

		await PUT({ 
			params: { id: orderId.toString() }, 
			request, 
			locals: mockLocals 
		} as any);

		// Verificar que apenas 1 chamada foi feita (a atualização inicial, não a automática)
		expect(orderUpdateCalls).toBe(1);
	});

	it('não deve afetar pedidos sem itens RENTAL', async () => {
		const orderId = 1;
		const mockOrder = {
			id: orderId,
			status: 'CONFIRMED',
			orderItems: [
				{ id: 1, itemType: 'SALE', itemTaken: true },
				{ id: 2, itemType: 'SALE', itemTaken: true }
			]
		};

		// Mock do pedido atual
		(prisma.order.findUnique as any).mockResolvedValue(mockOrder);

		let orderUpdateCalls = 0;
		(prisma.$transaction as any).mockImplementation(async (callback: any) => {
			const mockTx = {
				order: {
					update: vi.fn().mockImplementation(() => {
						orderUpdateCalls++;
						return Promise.resolve({ ...mockOrder, status: 'CONFIRMED' });
					})
				},
				orderItem: {
					findMany: vi.fn().mockResolvedValue([
						{ id: 1, itemType: 'SALE', itemTaken: true },
						{ id: 2, itemType: 'SALE', itemTaken: true }
					]),
					update: vi.fn().mockResolvedValue({})
				}
			};
			
			return await callback(mockTx);
		});

		// Mock da busca final do pedido
		(prisma.order.findUnique as any).mockResolvedValueOnce({
			...mockOrder,
			status: 'CONFIRMED',
			customer: null,
			user: { id: 1, username: 'test' },
			attendant: null,
			orderItems: mockOrder.orderItems.map(item => ({
				...item,
				unitPrice: 10,
				totalPrice: 10,
				discountValue: null,
				product: {
					costPrice: 5,
					rentalPrice: 10,
					salePrice: 15
				}
			})),
			orderPayments: [],
			subtotalAmount: 20,
			totalAmount: 20,
			discountValue: null
		});

		const request = {
			json: () => Promise.resolve({
				orderItems: [
					{ id: 1, itemTaken: true },
					{ id: 2, itemTaken: true }
				]
			})
		};

		await PUT({ 
			params: { id: orderId.toString() }, 
			request, 
			locals: mockLocals 
		} as any);

		// Verificar que apenas 1 chamada foi feita (a atualização inicial, não a automática)
		expect(orderUpdateCalls).toBe(1);
	});
});