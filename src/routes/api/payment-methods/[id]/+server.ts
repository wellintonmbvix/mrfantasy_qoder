import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/database.js';
import { z } from 'zod';

const PaymentMethodUpdateSchema = z.object({
	name: z.string().min(1, 'Nome é obrigatório').optional(),
	description: z.string().optional(),
	active: z.boolean().optional()
});

export const GET: RequestHandler = async ({ params }) => {
	try {
		const paymentMethod = await prisma.paymentMethod.findUnique({
			where: { id: parseInt(params.id) },
			include: {
				orderPayments: {
					include: {
						order: {
							select: {
								id: true,
								orderNumber: true,
								totalAmount: true,
								orderDate: true
							}
						}
					},
					take: 10,
					orderBy: { createdAt: 'desc' }
				}
			}
		});

		if (!paymentMethod) {
			return json({ error: 'Meio de pagamento não encontrado' }, { status: 404 });
		}

		return json(paymentMethod);
	} catch (error) {
		console.error('Error fetching payment method:', error);
		return json({ error: 'Erro ao buscar meio de pagamento' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Usuário não autenticado' }, { status: 401 });
		}

		if (locals.user.role !== 'ADMIN') {
			return json({ error: 'Acesso negado. Apenas administradores podem gerenciar meios de pagamento' }, { status: 403 });
		}

		const data = await request.json();
		const validatedData = PaymentMethodUpdateSchema.parse(data);

		const paymentMethodId = parseInt(params.id);

		// Check if payment method exists
		const existingPaymentMethod = await prisma.paymentMethod.findUnique({
			where: { id: paymentMethodId }
		});

		if (!existingPaymentMethod) {
			return json({ error: 'Meio de pagamento não encontrado' }, { status: 404 });
		}

		// If name is being updated, check for duplicates
		if (validatedData.name && validatedData.name !== existingPaymentMethod.name) {
			const duplicatePaymentMethod = await prisma.paymentMethod.findFirst({
				where: { 
					name: validatedData.name,
					id: { not: paymentMethodId }
				}
			});

			if (duplicatePaymentMethod) {
				return json({ error: 'Já existe um meio de pagamento com este nome' }, { status: 400 });
			}
		}

		const paymentMethod = await prisma.paymentMethod.update({
			where: { id: paymentMethodId },
			data: validatedData
		});

		return json(paymentMethod);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return json(
				{ error: 'Dados inválidos', details: error.errors },
				{ status: 400 }
			);
		}

		console.error('Error updating payment method:', error);
		return json({ error: 'Erro ao atualizar meio de pagamento' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Usuário não autenticado' }, { status: 401 });
		}

		if (locals.user.role !== 'ADMIN') {
			return json({ error: 'Acesso negado. Apenas administradores podem gerenciar meios de pagamento' }, { status: 403 });
		}

		const paymentMethodId = parseInt(params.id);

		// Check if payment method exists
		const existingPaymentMethod = await prisma.paymentMethod.findUnique({
			where: { id: paymentMethodId },
			include: {
				orderPayments: true
			}
		});

		if (!existingPaymentMethod) {
			return json({ error: 'Meio de pagamento não encontrado' }, { status: 404 });
		}

		// Check if payment method is being used in orders
		if (existingPaymentMethod.orderPayments.length > 0) {
			return json({ error: 'Não é possível excluir um meio de pagamento que está sendo usado em pedidos' }, { status: 400 });
		}

		await prisma.paymentMethod.delete({
			where: { id: paymentMethodId }
		});

		return json({ message: 'Meio de pagamento excluído com sucesso' });
	} catch (error) {
		console.error('Error deleting payment method:', error);
		return json({ error: 'Erro ao excluir meio de pagamento' }, { status: 500 });
	}
};