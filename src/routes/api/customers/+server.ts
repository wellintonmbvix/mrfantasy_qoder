import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/database.js';
import { z } from 'zod';
import { createAuditLog } from '$lib/server/auditLog.js'; // Importando serviço de auditoria

const CustomerSchema = z.object({
	name: z.string().min(1, 'Nome é obrigatório'),
	email: z.string().email('Email inválido'),
	phone: z.string().min(1, 'Telefone é obrigatório'),
	phone2: z.string().optional(),
	address: z.string().min(1, 'Endereço é obrigatório'),
	number: z.string().min(1, 'Número é obrigatório'),
	complement: z.string().optional(),
	neighborhood: z.string().min(1, 'Bairro é obrigatório'),
	city: z.string().min(1, 'Cidade é obrigatória'),
	state: z.string().min(1, 'Estado é obrigatório'),
	zipCode: z.string().min(1, 'CEP é obrigatório'),
	documentNumber: z.string().min(1, 'Documento é obrigatório')
});

export const GET: RequestHandler = async ({ url }) => {
	try {
		const search = url.searchParams.get('search') || '';
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '10');
		const skip = (page - 1) * limit;

		const where = search
			? {
					OR: [
						{ name: { contains: search } },
						{ email: { contains: search } },
						{ phone: { contains: search } },
						{ phone2: { contains: search } },
						{ documentNumber: { contains: search } },
						{ city: { contains: search } },
						{ neighborhood: { contains: search } }
					],
					active: true
			  }
			: { active: true };

		const [customers, total] = await Promise.all([
			prisma.customer.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' }
			}),
			prisma.customer.count({ where })
		]);

		return json({
			customers,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit)
			}
		});
	} catch (error) {
		return json(
			{ error: 'Erro ao buscar clientes' },
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const data = await request.json();
		const validatedData = CustomerSchema.parse(data);

		// Check if customer already exists
		const existingCustomer = await prisma.customer.findFirst({
			where: {
				OR: [
					{ email: validatedData.email },
					{ documentNumber: validatedData.documentNumber }
				]
			}
		});

		if (existingCustomer) {
			return json(
				{ error: 'Cliente com este email ou documento já existe' },
				{ status: 400 }
			);
		}

		const customer = await prisma.customer.create({
			data: validatedData
		});

		// Registrar log de auditoria para criação
		try {
			if (locals.user) {
				await createAuditLog({
					module: 'customers',
					actionType: 'CREATE',
					newData: customer,
					userId: locals.user.id
				});
			}
		} catch (logError) {
			console.error('Erro ao registrar log de auditoria:', logError);
		}

		return json(customer, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return json(
				{ error: 'Dados inválidos', details: error.errors },
				{ status: 400 }
			);
		}

		return json(
			{ error: 'Erro ao criar cliente' },
			{ status: 500 }
		);
	}
};