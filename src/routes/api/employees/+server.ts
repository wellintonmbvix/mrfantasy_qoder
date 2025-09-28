import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/database.js';
import { z } from 'zod';
import { createAuditLog } from '$lib/server/auditLog.js'; // Importando serviço de auditoria

const EmployeeSchema = z.object({
	name: z.string().min(1, 'Nome é obrigatório'),
	abbreviation: z.string().min(1, 'Abreviatura é obrigatória').max(10, 'Abreviatura deve ter no máximo 10 caracteres'),
	email: z.string().email('Email inválido'),
	phone: z.string().min(1, 'Telefone é obrigatório'),
	phone2: z.string().nullable().optional(),
	address: z.string().min(1, 'Endereço é obrigatório'),
	number: z.string().min(1, 'Número é obrigatório'),
	complement: z.string().nullable().optional(),
	neighborhood: z.string().min(1, 'Bairro é obrigatório'),
	city: z.string().min(1, 'Cidade é obrigatória'),
	state: z.string().min(1, 'Estado é obrigatório'),
	zipCode: z.string().min(1, 'CEP é obrigatório'),
	documentNumber: z.string().min(1, 'Documento é obrigatório'),
	position: z.string().min(1, 'Função é obrigatória'),
	hireDate: z.string().min(1, 'Data de admissão é obrigatória'),
	dismissalDate: z.string().nullable().optional()
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
						{ abbreviation: { contains: search } },
						{ email: { contains: search } },
						{ phone: { contains: search } },
						{ phone2: { contains: search } },
						{ documentNumber: { contains: search } },
						{ city: { contains: search } },
						{ neighborhood: { contains: search } },
						{ position: { contains: search } }
					],
					active: true
			  }
			: { active: true };

		const [employees, total] = await Promise.all([
			prisma.employee.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' }
			}),
			prisma.employee.count({ where })
		]);

		return json({
			employees,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit)
			}
		});
	} catch (error) {
		return json(
			{ error: 'Erro ao buscar funcionários' },
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const data = await request.json();
		const validatedData = EmployeeSchema.parse(data);

		// Convert date strings to Date objects
		const employeeData = {
			...validatedData,
			hireDate: new Date(validatedData.hireDate),
			dismissalDate: validatedData.dismissalDate ? new Date(validatedData.dismissalDate) : null
		};

		// Check if employee already exists
		const existingEmployee = await prisma.employee.findFirst({
			where: {
				OR: [
					{ email: employeeData.email },
					{ documentNumber: employeeData.documentNumber }
				]
			}
		});

		if (existingEmployee) {
			return json(
				{ error: 'Funcionário com este email ou documento já existe' },
				{ status: 400 }
			);
		}

		const employee = await prisma.employee.create({
			data: employeeData
		});

		// Registrar log de auditoria para criação
		try {
			if (locals.user) {
				await createAuditLog({
					module: 'employees',
					actionType: 'CREATE',
					newData: employee,
					userId: locals.user.id
				});
			}
		} catch (logError) {
			console.error('Erro ao registrar log de auditoria:', logError);
		}

		return json(employee, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return json(
				{ error: 'Dados inválidos', details: error.errors },
				{ status: 400 }
			);
		}

		return json(
			{ error: 'Erro ao criar funcionário' },
			{ status: 500 }
		);
	}
};