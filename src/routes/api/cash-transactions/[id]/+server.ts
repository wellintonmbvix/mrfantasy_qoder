import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/database.js';
import { cancelCashTransactionSchema } from '$lib/utils/validation';
import { ZodError } from 'zod';

/**
 * GET /api/cash-transactions/[id] - Busca transação específica
 */
export const GET = async ({ params, locals }) => {
	if (!locals.user) {
		return new Response('Não autorizado', { status: 401 });
	}

	try {
		const id = parseInt(params.id);

		if (isNaN(id)) {
			return json({ error: 'ID inválido' }, { status: 400 });
		}

		const where: any = { id };

		// Usuários comuns só podem ver suas próprias transações
		if (locals.user.role === 'EMPLOYEE') {
			where.userId = locals.user.id;
		}

		const transaction = await prisma.cashTransaction.findFirst({
			where,
			include: {
				user: {
					select: {
						id: true,
						username: true,
						email: true
					}
				},
				cancelledByUser: {
					select: {
						id: true,
						username: true,
						email: true
					}
				}
			}
		});

		if (!transaction) {
			return json({ error: 'Transação não encontrada' }, { status: 404 });
		}

		return json(transaction);
	} catch (error) {
		console.error('Erro ao buscar transação:', error);
		return json({ error: 'Erro ao buscar transação' }, { status: 500 });
	}
};

/**
 * PUT /api/cash-transactions/[id] - Cancela transação (apenas ADMIN/MANAGER)
 */
export const PUT = async ({ params, request, locals }) => {
	if (!locals.user) {
		return new Response('Não autorizado', { status: 401 });
	}

	// Verificar se o usuário tem permissão para cancelar
	if (locals.user.role === 'EMPLOYEE') {
		return json({ 
			error: 'Acesso negado. Apenas administradores e gerentes podem cancelar lançamentos.' 
		}, { status: 403 });
	}

	try {
		const id = parseInt(params.id);

		if (isNaN(id)) {
			return json({ error: 'ID inválido' }, { status: 400 });
		}

		const data = await request.json();
		const validatedData = cancelCashTransactionSchema.parse({
			id,
			cancelReason: data.cancelReason
		});

		// Verificar se a transação existe e não está cancelada
		const existingTransaction = await prisma.cashTransaction.findUnique({
			where: { id }
		});

		if (!existingTransaction) {
			return json({ error: 'Transação não encontrada' }, { status: 404 });
		}

		if (existingTransaction.status === 'CANCELLED') {
			return json({ error: 'Transação já está cancelada' }, { status: 409 });
		}

		// Cancelar a transação
		const cancelledTransaction = await prisma.cashTransaction.update({
			where: { id },
			data: {
				status: 'CANCELLED',
				cancelledAt: new Date(),
				cancelledBy: locals.user.id,
				cancelReason: validatedData.cancelReason
			},
			include: {
				user: {
					select: {
						id: true,
						username: true,
						email: true
					}
				},
				cancelledByUser: {
					select: {
						id: true,
						username: true,
						email: true
					}
				}
			}
		});

		return json(cancelledTransaction);
	} catch (error) {
		if (error instanceof ZodError) {
			return json({
				error: 'Dados inválidos',
				details: error.errors
			}, { status: 400 });
		}

		console.error('Erro ao cancelar transação:', error);
		return json({ error: 'Erro ao cancelar transação' }, { status: 500 });
	}
};