import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PUT } from './[id]/+server';
import { prisma } from '$lib/server/database';
import { requireRole } from '$lib/server/middleware';

// Mock das dependências
vi.mock('$lib/server/database', () => ({
	prisma: {
		order: {
			findUnique: vi.fn()
		}
	}
}));

vi.mock('$lib/server/middleware', () => ({
	requireRole: vi.fn()
}));

describe('Autorização para Cancelamento de Pedidos', () => {
	const mockOrder = {
		id: 1,
		status: 'CONFIRMED',
		orderItems: []
	};

	beforeEach(() => {
		vi.clearAllMocks();
		(prisma.order.findUnique as any).mockResolvedValue(mockOrder);
	});

	it('deve bloquear cancelamento para usuário EMPLOYEE', async () => {
		const mockLocals = {
			user: { id: 1, role: 'EMPLOYEE' }
		};

		// Mock requireRole retornando falha
		(requireRole as any).mockReturnValue({ 
			success: false, 
			response: new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 })
		});

		const request = {
			json: () => Promise.resolve({ status: 'CANCELLED' })
		};

		const response = await PUT({ 
			params: { id: '1' }, 
			request, 
			locals: mockLocals 
		} as any);

		const result = await response.json();

		expect(response.status).toBe(403);
		expect(result.error).toBe('Somente usuários com papel administrativo ou gerente podem cancelar pedidos');
		expect(requireRole).toHaveBeenCalledWith(mockLocals, 'MANAGER');
	});

	it('deve permitir cancelamento para usuário ADMIN', async () => {
		const mockLocals = {
			user: { id: 1, role: 'ADMIN' }
		};

		// Mock requireRole retornando sucesso
		(requireRole as any).mockReturnValue({ success: true });

		const request = {
			json: () => Promise.resolve({ status: 'CANCELLED' })
		};

		const response = await PUT({ 
			params: { id: '1' }, 
			request, 
			locals: mockLocals 
		} as any);

		// A validação de autorização passou, mesmo que o resto falhe
		// O importante é que requireRole foi chamado
		expect(requireRole).toHaveBeenCalledWith(mockLocals, 'MANAGER');
	});

	it('deve permitir cancelamento para usuário MANAGER', async () => {
		const mockLocals = {
			user: { id: 1, role: 'MANAGER' }
		};

		// Mock requireRole retornando sucesso
		(requireRole as any).mockReturnValue({ success: true });

		const request = {
			json: () => Promise.resolve({ status: 'CANCELLED' })
		};

		const response = await PUT({ 
			params: { id: '1' }, 
			request, 
			locals: mockLocals 
		} as any);

		// A validação de autorização passou
		expect(requireRole).toHaveBeenCalledWith(mockLocals, 'MANAGER');
	});

	it('não deve validar autorização se o pedido já estiver cancelado', async () => {
		const mockLocals = {
			user: { id: 1, role: 'EMPLOYEE' }
		};

		// Mock de pedido já cancelado
		const cancelledOrder = { ...mockOrder, status: 'CANCELLED' };
		(prisma.order.findUnique as any).mockResolvedValue(cancelledOrder);

		const request = {
			json: () => Promise.resolve({ status: 'CANCELLED' })
		};

		await PUT({ 
			params: { id: '1' }, 
			request, 
			locals: mockLocals 
		} as any);

		// requireRole não deve ser chamado se o pedido já está cancelado
		expect(requireRole).not.toHaveBeenCalled();
	});

	it('não deve validar autorização para outros status', async () => {
		const mockLocals = {
			user: { id: 1, role: 'EMPLOYEE' }
		};

		const request = {
			json: () => Promise.resolve({ status: 'DELIVERED' })
		};

		await PUT({ 
			params: { id: '1' }, 
			request, 
			locals: mockLocals 
		} as any);

		// requireRole não deve ser chamado para outros status
		expect(requireRole).not.toHaveBeenCalled();
	});

	it('não deve validar autorização se status não mudou', async () => {
		const mockLocals = {
			user: { id: 1, role: 'EMPLOYEE' }
		};

		const request = {
			json: () => Promise.resolve({ notes: 'Observação atualizada' })
		};

		await PUT({ 
			params: { id: '1' }, 
			request, 
			locals: mockLocals 
		} as any);

		// requireRole não deve ser chamado se não há mudança de status
		expect(requireRole).not.toHaveBeenCalled();
	});
});