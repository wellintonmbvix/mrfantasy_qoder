import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/database.js';
import { z } from 'zod';

const GroupUpdateSchema = z.object({
	name: z.string().min(1, 'Nome é obrigatório').optional(),
	description: z.string().optional(),
	category: z.string().min(1, 'Categoria é obrigatória').optional()
});

export const GET: RequestHandler = async ({ params }) => {
	try {
		const group = await prisma.productGroup.findUnique({
			where: { id: parseInt(params.id) },
			include: {
				products: {
					where: { active: true },
					orderBy: { name: 'asc' }
				}
			}
		});

		if (!group) {
			return json({ error: 'Grupo não encontrado' }, { status: 404 });
		}

		return json(group);
	} catch (error) {
		return json({ error: 'Erro ao buscar grupo' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const data = await request.json();
		const validatedData = GroupUpdateSchema.parse(data);

		const group = await prisma.productGroup.update({
			where: { id: parseInt(params.id) },
			data: validatedData
		});

		return json(group);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return json(
				{ error: 'Dados inválidos', details: error.errors },
				{ status: 400 }
			);
		}

		return json({ error: 'Erro ao atualizar grupo' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		// Check if group has products
		const productsCount = await prisma.product.count({
			where: { groupId: parseInt(params.id), active: true }
		});

		if (productsCount > 0) {
			return json(
				{ error: 'Não é possível excluir grupo com produtos associados' },
				{ status: 400 }
			);
		}

		await prisma.productGroup.update({
			where: { id: parseInt(params.id) },
			data: { active: false }
		});

		return json({ success: true });
	} catch (error) {
		return json({ error: 'Erro ao excluir grupo' }, { status: 500 });
	}
};