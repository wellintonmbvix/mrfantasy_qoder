import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/database.js';
import { z } from 'zod';

const PaymentMethodSchema = z.object({
	name: z.string().min(1, 'Nome é obrigatório'),
	description: z.string().optional()
});

export const GET: RequestHandler = async ({ url }) => {
	try {
		const search = url.searchParams.get('search') || '';
		const active = url.searchParams.get('active');
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '10');
		const skip = (page - 1) * limit;

		const where = {
			...(search && {
				name: { contains: search, mode: 'insensitive' as const }
			}),
			...(active !== null && { active: active === 'true' })
		};

		const [paymentMethods, total] = await Promise.all([
			prisma.paymentMethod.findMany({
				where,
				skip,
				take: limit,
				orderBy: { name: 'asc' }
			}),
			prisma.paymentMethod.count({ where })
		]);

		return json({
			paymentMethods,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit)
			}
		});
	} catch (error) {
		console.error('Error fetching payment methods:', error);
		return json({ error: 'Erro ao buscar meios de pagamento' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Usuário não autenticado' }, { status: 401 });
		}

		if (locals.user.role !== 'ADMIN') {
			return json({ error: 'Acesso negado. Apenas administradores podem gerenciar meios de pagamento' }, { status: 403 });
		}

		const data = await request.json();
		const validatedData = PaymentMethodSchema.parse(data);

		// Check if name already exists
		const existingPaymentMethod = await prisma.paymentMethod.findFirst({
			where: { name: validatedData.name }
		});

		if (existingPaymentMethod) {
			return json({ error: 'Já existe um meio de pagamento com este nome' }, { status: 400 });
		}

		const paymentMethod = await prisma.paymentMethod.create({
			data: validatedData
		});

		return json(paymentMethod, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return json(
				{ error: 'Dados inválidos', details: error.errors },
				{ status: 400 }
			);
		}

		console.error('Error creating payment method:', error);
		return json({ error: 'Erro ao criar meio de pagamento' }, { status: 500 });
	}
};