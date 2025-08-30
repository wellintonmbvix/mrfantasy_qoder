import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/database.js';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const updateUserSchema = z.object({
	username: z.string().min(3).max(50).optional(),
	email: z.string().email().optional(),
	password: z.string().min(6).optional(),
	role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
	active: z.boolean().optional()
});

// GET /api/users/[id] - Get user by ID
export const GET: RequestHandler = async ({ params, locals }) => {
	// Only admin users can access user details
	if (!locals.user || locals.user.role !== 'ADMIN') {
		return json({ error: 'Acesso negado' }, { status: 403 });
	}

	try {
		const userId = Number(params.id);

		if (isNaN(userId)) {
			return json({ error: 'ID de usuário inválido' }, { status: 400 });
		}

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				username: true,
				email: true,
				role: true,
				active: true,
				createdAt: true,
				updatedAt: true
			}
		});

		if (!user) {
			return json({ error: 'Usuário não encontrado' }, { status: 404 });
		}

		return json({ user });
	} catch (error) {
		console.error('Error fetching user:', error);
		return json({ error: 'Erro interno do servidor' }, { status: 500 });
	}
};

// PUT /api/users/[id] - Update user
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	// Only admin users can update users
	if (!locals.user || locals.user.role !== 'ADMIN') {
		return json({ error: 'Acesso negado' }, { status: 403 });
	}

	try {
		const userId = Number(params.id);

		if (isNaN(userId)) {
			return json({ error: 'ID de usuário inválido' }, { status: 400 });
		}

		const body = await request.json();
		const validation = updateUserSchema.safeParse(body);

		if (!validation.success) {
			return json({ 
				error: 'Dados inválidos',
				details: validation.error.flatten().fieldErrors
			}, { status: 400 });
		}

		const updateData = validation.data;

		// Check if user exists
		const existingUser = await prisma.user.findUnique({
			where: { id: userId }
		});

		if (!existingUser) {
			return json({ error: 'Usuário não encontrado' }, { status: 404 });
		}

		// Prevent admin from deactivating themselves
		if (userId === locals.user.id && updateData.active === false) {
			return json({ error: 'Você não pode desativar sua própria conta' }, { status: 400 });
		}

		// Check for duplicate username or email
		if (updateData.username || updateData.email) {
			const conflictUser = await prisma.user.findFirst({
				where: {
					AND: [
						{ id: { not: userId } },
						{
							OR: [
								updateData.username ? { username: updateData.username } : {},
								updateData.email ? { email: updateData.email } : {}
							].filter(obj => Object.keys(obj).length > 0)
						}
					]
				}
			});

			if (conflictUser) {
				return json({ 
					error: conflictUser.username === updateData.username 
						? 'Nome de usuário já existe' 
						: 'Email já está em uso'
				}, { status: 409 });
			}
		}

		// Hash password if provided
		if (updateData.password) {
			updateData.password = await bcrypt.hash(updateData.password, 10);
		}

		// Update user
		const user = await prisma.user.update({
			where: { id: userId },
			data: updateData,
			select: {
				id: true,
				username: true,
				email: true,
				role: true,
				active: true,
				createdAt: true,
				updatedAt: true
			}
		});

		return json({ user });
	} catch (error) {
		console.error('Error updating user:', error);
		return json({ error: 'Erro interno do servidor' }, { status: 500 });
	}
};

// DELETE /api/users/[id] - Delete user (soft delete by setting active to false)
export const DELETE: RequestHandler = async ({ params, locals }) => {
	// Only admin users can delete users
	if (!locals.user || locals.user.role !== 'ADMIN') {
		return json({ error: 'Acesso negado' }, { status: 403 });
	}

	try {
		const userId = Number(params.id);

		if (isNaN(userId)) {
			return json({ error: 'ID de usuário inválido' }, { status: 400 });
		}

		// Prevent admin from deleting themselves
		if (userId === locals.user.id) {
			return json({ error: 'Você não pode excluir sua própria conta' }, { status: 400 });
		}

		// Check if user exists
		const existingUser = await prisma.user.findUnique({
			where: { id: userId }
		});

		if (!existingUser) {
			return json({ error: 'Usuário não encontrado' }, { status: 404 });
		}

		// Soft delete by setting active to false
		await prisma.user.update({
			where: { id: userId },
			data: { active: false }
		});

		return json({ message: 'Usuário excluído com sucesso' });
	} catch (error) {
		console.error('Error deleting user:', error);
		return json({ error: 'Erro interno do servidor' }, { status: 500 });
	}
};