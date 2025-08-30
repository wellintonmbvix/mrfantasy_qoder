import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/database.js';
import { z } from 'zod';

const GroupSchema = z.object({
	name: z.string().min(1, 'Nome é obrigatório'),
	description: z.string().optional(),
	category: z.string().min(1, 'Categoria é obrigatória')
});

export const GET: RequestHandler = async ({ url }) => {
	try {
		const search = url.searchParams.get('search') || '';
		const category = url.searchParams.get('category') || '';

		const where = {
			active: true,
			...(search && {
				OR: [
					{ name: { contains: search } },
					{ description: { contains: search } }
				]
			}),
			...(category && { category })
		};

		const groups = await prisma.productGroup.findMany({
			where,
			include: {
				_count: {
					select: { products: true }
				}
			},
			orderBy: { name: 'asc' }
		});

		return json(groups);
	} catch (error) {
		return json({ error: 'Erro ao buscar grupos' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();
		const validatedData = GroupSchema.parse(data);

		const group = await prisma.productGroup.create({
			data: validatedData
		});

		return json(group, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return json(
				{ error: 'Dados inválidos', details: error.errors },
				{ status: 400 }
			);
		}

		return json({ error: 'Erro ao criar grupo' }, { status: 500 });
	}
};