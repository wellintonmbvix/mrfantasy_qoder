import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/database.js';
import { z } from 'zod';
import { createAuditLog } from '$lib/server/auditLog.js'; // Importando serviço de auditoria

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

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		// Obter dados originais antes da atualização para o log
		const originalGroup = await prisma.productGroup.findUnique({
			where: { id: parseInt(params.id) }
		});

		const data = await request.json();
		const validatedData = GroupUpdateSchema.parse(data);

		const group = await prisma.productGroup.update({
			where: { id: parseInt(params.id) },
			data: validatedData
		});

		// Registrar log de auditoria para atualização
		try {
			if (locals.user && originalGroup) {
				await createAuditLog({
					module: 'groups',
					actionType: 'UPDATE',
					originalData: originalGroup,
					newData: group,
					userId: locals.user.id
				});
			}
		} catch (logError) {
			console.error('Erro ao registrar log de auditoria:', logError);
		}

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

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		// Obter dados originais antes da exclusão para o log
		const originalGroup = await prisma.productGroup.findUnique({
			where: { id: parseInt(params.id) }
		});

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

		// Registrar log de auditoria para exclusão
		try {
			if (locals.user && originalGroup) {
				await createAuditLog({
					module: 'groups',
					actionType: 'DELETE',
					originalData: originalGroup,
					userId: locals.user.id
				});
			}
		} catch (logError) {
			console.error('Erro ao registrar log de auditoria:', logError);
		}

		return json({ success: true });
	} catch (error) {
		return json({ error: 'Erro ao excluir grupo' }, { status: 500 });
	}
};