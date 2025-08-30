import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AuthService } from '$lib/server/auth.js';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { email, password } = await request.json();

		if (!email || !password) {
			return json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
		}

		const result = await AuthService.login({ email, password });

		// Set auth cookie
		cookies.set('auth-token', result.token, {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 // 24 hours
		});

		return json({
			success: true,
			user: result.user
		});
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Erro interno do servidor' },
			{ status: 401 }
		);
	}
};