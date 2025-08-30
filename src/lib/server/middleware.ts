import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { getDatabaseErrorMessage } from '$lib/utils/errors.js';

// Generic validation middleware
export function validateRequest<T>(schema: z.ZodSchema<T>) {
	return async (request: Request): Promise<{ success: true; data: T } | { success: false; response: Response }> => {
		try {
			const body = await request.json();
			const validation = schema.safeParse(body);

			if (!validation.success) {
				const errors: Record<string, string> = {};
				validation.error.errors.forEach(err => {
					const path = err.path.join('.');
					errors[path] = err.message;
				});

				return {
					success: false,
					response: json({
						error: 'Dados inválidos',
						details: errors
					}, { status: 400 })
				};
			}

			return { success: true, data: validation.data };
		} catch (error) {
			return {
				success: false,
				response: json({
					error: 'Formato de dados inválido'
				}, { status: 400 })
			};
		}
	};
}

// Generic error handler
export function handleError(error: any): Response {
	console.error('API Error:', error);

	// Prisma/Database errors
	if (error.code) {
		const message = getDatabaseErrorMessage(error);
		return json({ error: message }, { status: 400 });
	}

	// Validation errors
	if (error instanceof z.ZodError) {
		const errors: Record<string, string> = {};
		error.errors.forEach(err => {
			const path = err.path.join('.');
			errors[path] = err.message;
		});

		return json({
			error: 'Dados inválidos',
			details: errors
		}, { status: 400 });
	}

	// Default error
	return json({
		error: 'Erro interno do servidor'
	}, { status: 500 });
}

// Authentication middleware
export function requireAuth(locals: App.Locals): { success: true } | { success: false; response: Response } {
	if (!locals.user) {
		return {
			success: false,
			response: json({ error: 'Acesso não autorizado' }, { status: 401 })
		};
	}
	return { success: true };
}

// Role-based authorization middleware
export function requireRole(locals: App.Locals, requiredRole: 'ADMIN' | 'MANAGER' | 'EMPLOYEE'): { success: true } | { success: false; response: Response } {
	const authCheck = requireAuth(locals);
	if (!authCheck.success) return authCheck;

	const roleHierarchy = { ADMIN: 3, MANAGER: 2, EMPLOYEE: 1 };
	const userLevel = roleHierarchy[locals.user!.role as keyof typeof roleHierarchy] || 0;
	const requiredLevel = roleHierarchy[requiredRole];

	if (userLevel < requiredLevel) {
		return {
			success: false,
			response: json({ error: 'Acesso negado' }, { status: 403 })
		};
	}

	return { success: true };
}

// Pagination middleware
export function handlePagination(url: URL): {
	page: number;
	limit: number;
	offset: number;
	search: string;
} {
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 10));
	const offset = (page - 1) * limit;
	const search = url.searchParams.get('search') || '';

	return { page, limit, offset, search };
}

// Response wrapper for consistent API responses
export function apiResponse<T>(data: T, options?: {
	message?: string;
	status?: number;
}) {
	return json({
		success: true,
		data,
		message: options?.message
	}, { status: options?.status || 200 });
}

export function apiError(message: string, options?: {
	status?: number;
	details?: any;
}) {
	return json({
		success: false,
		error: message,
		details: options?.details
	}, { status: options?.status || 400 });
}