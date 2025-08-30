import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/database.js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const userSchema = z.object({
	username: z.string().min(3).max(50),
	email: z.string().email(),
	password: z.string().min(6),
	role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE'])
});

const updateUserSchema = z.object({
	username: z.string().min(3).max(50).optional(),
	email: z.string().email().optional(),
	password: z.string().min(6).optional(),
	role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
	active: z.boolean().optional()
});

// GET /api/users - List users with pagination and search
export const GET: RequestHandler = async ({ url, locals }) => {
	// Only admin users can access user management
	if (!locals.user || locals.user.role !== 'ADMIN') {
		return json({ error: 'Acesso negado' }, { status: 403 });
	}

	try {
		const search = url.searchParams.get('search') || '';
		const page = Number(url.searchParams.get('page')) || 1;
		const limit = Number(url.searchParams.get('limit')) || 10;
		const offset = (page - 1) * limit;

		const where = search ? {
			OR: [
				{ username: { contains: search, mode: 'insensitive' as const } },
				{ email: { contains: search, mode: 'insensitive' as const } }
			]
		} : {};

		const [users, total] = await Promise.all([
			prisma.user.findMany({
				where,
				select: {
					id: true,
					username: true,
					email: true,
					role: true,
					active: true,
					createdAt: true,
					updatedAt: true
				},
				orderBy: { createdAt: 'desc' },
				skip: offset,
				take: limit
			}),
			prisma.user.count({ where })
		]);

		return json({
			users,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit)
			}
		});
	} catch (error) {
		console.error('Error fetching users:', error);
		return json({ error: 'Erro interno do servidor' }, { status: 500 });
	}
};

// POST /api/users - Create new user
export const POST: RequestHandler = async ({ request, locals }) => {
	// Only admin users can create users
	if (!locals.user || locals.user.role !== 'ADMIN') {
		return json({ error: 'Acesso negado' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const validation = userSchema.safeParse(body);

		if (!validation.success) {
			return json({ 
				error: 'Dados inválidos',
				details: validation.error.flatten().fieldErrors
			}, { status: 400 });
		}

		const { username, email, password, role } = validation.data;

		// Check if user already exists
		const existingUser = await prisma.user.findFirst({
			where: {
				OR: [
					{ username },
					{ email }
				]
			}
		});

		if (existingUser) {
			return json({ 
				error: existingUser.username === username 
					? 'Nome de usuário já existe' 
					: 'Email já está em uso'
			}, { status: 409 });
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create user
		const user = await prisma.user.create({
			data: {
				username,
				email,
				passwordHash: hashedPassword,
				role,
				active: true
			},
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

		return json({ user }, { status: 201 });
	} catch (error) {
		console.error('Error creating user:', error);
		return json({ error: 'Erro interno do servidor' }, { status: 500 });
	}
};