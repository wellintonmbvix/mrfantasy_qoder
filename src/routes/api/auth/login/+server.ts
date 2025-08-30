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

		console.log('Login attempt for:', email); // Debug log

		try {
			const result = await AuthService.login({ email, password });
			console.log('AuthService.login successful for:', email); // Debug log
			console.log('Generated token length:', result.token.length); // Debug log

			// Set auth cookie with more explicit settings
			cookies.set('auth-token', result.token, {
				path: '/',
				httpOnly: true,
				secure: false, // Set to false for development
				sameSite: 'lax',
				maxAge: 60 * 60 * 24, // 24 hours
				domain: undefined // Explicitly set to undefined for localhost
			});

			console.log('Cookie set successfully for user:', email); // Debug log
			
			// Verify the cookie was set by reading it back
			const setCookie = cookies.get('auth-token');
			console.log('Cookie verification - can read back:', !!setCookie); // Debug log

			return json({
				success: true,
				user: result.user
			});
		} catch (authError) {
			console.error('AuthService.login failed:', authError); // Debug log
			throw authError;
		}
	} catch (error) {
		console.error('Login error:', error); // Debug log
		return json(
			{ error: error instanceof Error ? error.message : 'Erro interno do servidor' },
			{ status: 401 }
		);
	}
};