import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/database.js';
import { cashTransactionSchema } from '$lib/utils/validation';
import { ZodError } from 'zod';

/**
 * GET /api/cash-transactions - Lista transações de caixa com filtros
 */
export const GET = async ({ url, locals }) => {
	if (!locals.user) {
		return new Response('Não autorizado', { status: 401 });
	}

	try {
		const page = parseInt(url.searchParams.get('page') ?? '1');
		const limit = parseInt(url.searchParams.get('limit') ?? '10');
		const userId = url.searchParams.get('userId');
		const type = url.searchParams.get('type');
		const status = url.searchParams.get('status') ?? 'ACTIVE';
		const startDate = url.searchParams.get('startDate');
		const endDate = url.searchParams.get('endDate');

		const skip = (page - 1) * limit;

		// Construir filtros
		const where: any = {
			status: status === 'ALL' ? undefined : status
		};

		if (userId) {
			where.userId = parseInt(userId);
		}

		if (type) {
			where.type = type;
		}

		if (startDate) {
			where.createdAt = {
				...where.createdAt,
				gte: new Date(startDate)
			};
		}

		if (endDate) {
			where.createdAt = {
				...where.createdAt,
				lte: new Date(endDate)
			};
		}

		// Filtro de acesso: usuários comuns só vêem seus próprios lançamentos
		if (locals.user.role === 'EMPLOYEE') {
			where.userId = locals.user.id;
		}

		const [transactions, total] = await Promise.all([
			prisma.cashTransaction.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' },
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
			}),
			prisma.cashTransaction.count({ where })
		]);

		return json({
			transactions,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit)
			}
		});
	} catch (error) {
		console.error('Erro ao buscar transações de caixa:', error);
		return json({ error: 'Erro ao buscar transações de caixa' }, { status: 500 });
	}
};

/**
 * POST /api/cash-transactions - Cria nova transação de caixa
 */
export const POST = async ({ request, locals }) => {
	if (!locals.user) {
		return new Response('Não autorizado', { status: 401 });
	}

	try {
		const data = await request.json();
		const validatedData = cashTransactionSchema.parse(data);

		// Criar a transação
		const transaction = await prisma.cashTransaction.create({
			data: {
				type: validatedData.type,
				amount: validatedData.amount,
				description: validatedData.description,
				userId: locals.user.id
			},
			include: {
				user: {
					select: {
						id: true,
						username: true,
						email: true
					}
				}
			}
		});

		return json(transaction, { status: 201 });
	} catch (error) {
		if (error instanceof ZodError) {
			return json({
				error: 'Dados inválidos',
				details: error.errors
			}, { status: 400 });
		}

		console.error('Erro ao criar transação de caixa:', error);
		return json({ error: 'Erro ao criar transação de caixa' }, { status: 500 });
	}
};