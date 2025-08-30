// @ts-nocheck
import { fail, redirect } from '@sveltejs/kit';
import { AuthService } from '$lib/server/auth.js';
import type { Actions } from './$types';

export const actions = {
default: async ({ request, cookies, url }: import('./$types').RequestEvent) => {
const data = await request.formData();
const email = data.get('email') as string;
const password = data.get('password') as string;

if (!email || !password) {
return fail(400, {
error: 'Email e senha são obrigatórios',
email
});
}

try {
const result = await AuthService.login({ email, password });

// Set auth cookie
cookies.set('auth-token', result.token, {
path: '/',
httpOnly: true,
secure: process.env.NODE_ENV === 'production',
sameSite: 'lax',
maxAge: 60 * 60 * 24 // 24 hours
});

// Redirect to dashboard or intended page
const redirectTo = url.searchParams.get('redirectTo') || '/dashboard/';
throw redirect(302, redirectTo);
} catch (error) {
return fail(401, {
error: error instanceof Error ? error.message : 'Erro interno do servidor',
email
});
}
}
};;null as any as Actions;