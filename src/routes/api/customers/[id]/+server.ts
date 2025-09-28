import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/database.js';
import { z } from 'zod';
import { createAuditLog } from '$lib/server/auditLog.js'; // Importando serviço de auditoria

const CustomerUpdateSchema = z.object({
	name: z.string().min(1, 'Nome é obrigatório').optional(),
	email: z.string().email('Email inválido').optional(),
	phone: z.string().min(1, 'Telefone é obrigatório').optional(),
	phone2: z.string().optional(),
	address: z.string().min(1, 'Endereço é obrigatório').optional(),
	number: z.string().min(1, 'Número é obrigatório').optional(),
	complement: z.string().optional(),
	neighborhood: z.string().min(1, 'Bairro é obrigatório').optional(),
	city: z.string().min(1, 'Cidade é obrigatória').optional(),
	state: z.string().min(1, 'Estado é obrigatório').optional(),
	zipCode: z.string().min(1, 'CEP é obrigatório').optional(),
	documentNumber: z.string().min(1, 'Documento é obrigatório').optional()
});

export const GET: RequestHandler = async ({ params }) => {
	try {
		const customer = await prisma.customer.findUnique({
			where: { id: parseInt(params.id) },
			include: {
				orders: {
					orderBy: { createdAt: 'desc' },
					take: 10
				}
			}
		});

		if (!customer) {
			return json({ error: 'Cliente não encontrado' }, { status: 404 });
		}

		return json(customer);
	} catch (error) {
		return json({ error: 'Erro ao buscar cliente' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		// Obter dados originais antes da atualização para o log
		const originalCustomer = await prisma.customer.findUnique({
			where: { id: parseInt(params.id) }
		});

		const data = await request.json();
		const validatedData = CustomerUpdateSchema.parse(data);

		// Check if email or document already exists for another customer
		if (validatedData.email || validatedData.documentNumber) {
			const existingCustomer = await prisma.customer.findFirst({
				where: {
					AND: [
						{ id: { not: parseInt(params.id) } },
						{
							OR: [
								validatedData.email ? { email: validatedData.email } : {},
								validatedData.documentNumber ? { documentNumber: validatedData.documentNumber } : {}
							].filter(condition => Object.keys(condition).length > 0)
						}
					]
				}
			});

			if (existingCustomer) {
				return json(
					{ error: 'Cliente com este email ou documento já existe' },
					{ status: 400 }
				);
			}
		}

		const customer = await prisma.customer.update({
			where: { id: parseInt(params.id) },
			data: validatedData
		});

		// Registrar log de auditoria para atualização
		try {
			if (locals.user && originalCustomer) {
				await createAuditLog({
					module: 'customers',
					actionType: 'UPDATE',
					originalData: originalCustomer,
					newData: customer,
					userId: locals.user.id
				});
			}
		} catch (logError) {
			console.error('Erro ao registrar log de auditoria:', logError);
		}

		return json(customer);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return json(
				{ error: 'Dados inválidos', details: error.errors },
				{ status: 400 }
			);
		}

		return json({ error: 'Erro ao atualizar cliente' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		// Obter dados originais antes da exclusão para o log
		const originalCustomer = await prisma.customer.findUnique({
			where: { id: parseInt(params.id) }
		});

		await prisma.customer.update({
			where: { id: parseInt(params.id) },
			data: { active: false }
		});

		// Registrar log de auditoria para exclusão
		try {
			if (locals.user && originalCustomer) {
				await createAuditLog({
					module: 'customers',
					actionType: 'DELETE',
					originalData: originalCustomer,
					userId: locals.user.id
				});
			}
		} catch (logError) {
			console.error('Erro ao registrar log de auditoria:', logError);
		}

		return json({ success: true });
	} catch (error) {
		return json({ error: 'Erro ao desativar cliente' }, { status: 500 });
	}
};