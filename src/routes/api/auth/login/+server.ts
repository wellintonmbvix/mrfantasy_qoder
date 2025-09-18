import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AuthService } from '$lib/server/auth.js';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		// Clear any existing auth cookies first
		cookies.delete('auth-token', { path: '/' });
		
		const { email, password } = await request.json();

		if (!email || !password) {
			return json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
		}		

		try {
			const result = await AuthService.login({ email, password });

			// Set auth cookie with more explicit settings
			cookies.set('auth-token', result.token, {
				path: '/',
				httpOnly: true,
				secure: false, // Set to false for development
				sameSite: 'lax',
				maxAge: 60 * 60 * 24, // 24 hours
				domain: undefined // Explicitly set to undefined for localhost
			});			
			
			// Verify the cookie was set by reading it back
			const setCookie = cookies.get('auth-token');			

			return json({
				success: true,
				user: result.user
			});
		} catch (authError) {			
			throw authError;
		}
	} catch (error) {		
		return json(
			{ error: error instanceof Error ? error.message : 'Erro interno do servidor' },
			{ status: 401 }
		);
	}
};