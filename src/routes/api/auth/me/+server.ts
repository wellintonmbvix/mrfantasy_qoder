import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	console.log('API /me called, user in locals:', locals.user ? 'Yes' : 'No'); // Debug log
	
	if (!locals.user) {
		console.log('No user in locals, returning 401'); // Debug log
		return json({ error: 'Não autenticado' }, { status: 401 });
	}

	console.log('User found in locals:', locals.user.email); // Debug log
	return json({ user: locals.user });
};