import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/database.js';
import { z } from 'zod';
import { createAuditLog } from '$lib/server/auditLog.js'; // Importando serviço de auditoria

const EmployeeUpdateSchema = z.object({
	name: z.string().min(1, 'Nome é obrigatório').optional(),
	abbreviation: z.string().min(1, 'Abreviatura é obrigatória').max(10, 'Abreviatura deve ter no máximo 10 caracteres').optional(),
	email: z.string().email('Email inválido').optional(),
	phone: z.string().min(1, 'Telefone é obrigatório').optional(),
	phone2: z.string().nullable().optional(),
	address: z.string().min(1, 'Endereço é obrigatório').optional(),
	number: z.string().min(1, 'Número é obrigatório').optional(),
	complement: z.string().nullable().optional(),
	neighborhood: z.string().min(1, 'Bairro é obrigatório').optional(),
	city: z.string().min(1, 'Cidade é obrigatória').optional(),
	state: z.string().min(1, 'Estado é obrigatório').optional(),
	zipCode: z.string().min(1, 'CEP é obrigatório').optional(),
	documentNumber: z.string().min(1, 'Documento é obrigatório').optional(),
	position: z.string().min(1, 'Função é obrigatória').optional(),
	hireDate: z.string().optional(),
	dismissalDate: z.string().nullable().optional()
});

export const GET: RequestHandler = async ({ params }) => {
	try {
		if (!params.id) {
			return json({ error: 'ID do funcionário é obrigatório' }, { status: 400 });
		}

		const employee = await prisma.employee.findUnique({
			where: { id: parseInt(params.id) }
		});

		if (!employee) {
			return json({ error: 'Funcionário não encontrado' }, { status: 404 });
		}

		return json(employee);
	} catch (error) {
		return json({ error: 'Erro ao buscar funcionário' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!params.id) {
			return json({ error: 'ID do funcionário é obrigatório' }, { status: 400 });
		}

		// Obter dados originais antes da atualização para o log
		const originalEmployee = await prisma.employee.findUnique({
			where: { id: parseInt(params.id) }
		});

		const data = await request.json();
		const validatedData = EmployeeUpdateSchema.parse(data);

		// Convert date strings to Date objects if provided
		const updateData: any = { ...validatedData };
		if (validatedData.hireDate) {
			updateData.hireDate = new Date(validatedData.hireDate);
		}
		if (validatedData.dismissalDate) {
			updateData.dismissalDate = new Date(validatedData.dismissalDate);
		}

		// Check if email or document already exists for another employee
		if (validatedData.email || validatedData.documentNumber) {
			const existingEmployee = await prisma.employee.findFirst({
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

			if (existingEmployee) {
				return json(
					{ error: 'Funcionário com este email ou documento já existe' },
					{ status: 400 }
				);
			}
		}

		const employee = await prisma.employee.update({
			where: { id: parseInt(params.id) },
			data: updateData
		});

		// Registrar log de auditoria para atualização
		try {
			if (locals.user && originalEmployee) {
				await createAuditLog({
					module: 'employees',
					actionType: 'UPDATE',
					originalData: originalEmployee,
					newData: employee,
					userId: locals.user.id
				});
			}
		} catch (logError) {
			console.error('Erro ao registrar log de auditoria:', logError);
		}

		return json(employee);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return json(
				{ error: 'Dados inválidos', details: error.errors },
				{ status: 400 }
			);
		}

		return json({ error: 'Erro ao atualizar funcionário' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!params.id) {
			return json({ error: 'ID do funcionário é obrigatório' }, { status: 400 });
		}

		// Obter dados originais antes da exclusão para o log
		const originalEmployee = await prisma.employee.findUnique({
			where: { id: parseInt(params.id) }
		});

		await prisma.employee.update({
			where: { id: parseInt(params.id) },
			data: { active: false }
		});

		// Registrar log de auditoria para exclusão
		try {
			if (locals.user && originalEmployee) {
				await createAuditLog({
					module: 'employees',
					actionType: 'DELETE',
					originalData: originalEmployee,
					userId: locals.user.id
				});
			}
		} catch (logError) {
			console.error('Erro ao registrar log de auditoria:', logError);
		}

		return json({ success: true });
	} catch (error) {
		return json({ error: 'Erro ao desativar funcionário' }, { status: 500 });
	}
};