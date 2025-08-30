import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/database.js';

export const GET: RequestHandler = async () => {
	try {
		// Test database connection
		const userCount = await prisma.user.count();
		const testUser = await prisma.user.findUnique({
			where: { email: 'admin@mrfantasy.com' }
		});

		return json({
			success: true,
			database: 'connected',
			userCount,
			testUserExists: !!testUser,
			testUser: testUser ? {
				id: testUser.id,
				email: testUser.email,
				username: testUser.username,
				role: testUser.role
			} : null
		});
	} catch (error) {
		console.error('Database test error:', error);
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Database connection failed'
		}, { status: 500 });
	}
};