import { redirect } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware.js';
import type { RequestEvent } from '@sveltejs/kit';

export const load = async ({ locals, url }: RequestEvent) => {
	// Verificar se o usuário está logado e tem permissão (ADMIN ou MANAGER)
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	// Verificar se o usuário tem papel de ADMIN ou MANAGER
	const roleCheck = requireRole(locals, 'MANAGER');
	if (!roleCheck.success) {
		throw redirect(302, '/dashboard');
	}

	const search = url.searchParams.get('search') || '';
	const page = parseInt(url.searchParams.get('page') || '1');

	return {
		user: locals.user,
		search,
		page
	};
};