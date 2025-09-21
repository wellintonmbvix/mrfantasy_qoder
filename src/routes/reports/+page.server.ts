import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/database';

export const load: PageServerLoad = async ({ locals }) => {
	// Verificar se o usuário está autenticado
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	// Carregar dados para os filtros
	const [customers, employees] = await Promise.all([
		prisma.customer.findMany({
			where: { active: true },
			select: {
				id: true,
				name: true
			},
			orderBy: { name: 'asc' }
		}),
		prisma.employee.findMany({
			where: { active: true },
			select: {
				id: true,
				name: true,
				abbreviation: true
			},
			orderBy: { name: 'asc' }
		})
	]);

	return {
		user: locals.user,
		customers,
		employees
	};
};