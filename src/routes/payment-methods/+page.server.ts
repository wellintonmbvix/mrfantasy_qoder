import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/database.js';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Check if user is authenticated and is an admin
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	if (locals.user.role !== 'ADMIN') {
		throw redirect(302, '/dashboard');
	}

	try {
		const search = url.searchParams.get('search') || '';
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = 10;
		const skip = (page - 1) * limit;

		const where = search
			? { name: { contains: search, mode: 'insensitive' as const } }
			: {};

		const [paymentMethods, total] = await Promise.all([
			prisma.paymentMethod.findMany({
				where,
				skip,
				take: limit,
				orderBy: { name: 'asc' }
			}),
			prisma.paymentMethod.count({ where })
		]);

		return {
			paymentMethods,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit)
			},
			search
		};
	} catch (error) {
		console.error('Error loading payment methods:', error);
		return {
			paymentMethods: [],
			pagination: {
				page: 1,
				limit: 10,
				total: 0,
				pages: 0
			},
			search: ''
		};
	}
};