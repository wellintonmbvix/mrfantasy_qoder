import { fail, redirect } from '@sveltejs/kit';
import { AuthService } from '$lib/server/auth.js';
import type { Actions } from './$types';

export const actions: Actions = {
default: async ({ request, cookies, url }) => {
const data = await request.formData();
const email = data.get('email') as string;
const password = data.get('password') as string;

// Validação de entrada
if (!email || !password) {
return fail(400, {
error: 'Email e senha são obrigatórios',
email
});
}

// Tentativa de autenticação
let authResult;
try {
authResult = await AuthService.login({ email, password });
} catch (error) {
// Log para debugging em desenvolvimento
if (process.env.NODE_ENV === 'development') {
console.error('Login error:', error);
}

return fail(401, {
error: error instanceof Error ? error.message : 'Erro interno do servidor',
email
});
}

// Configurar cookie de autenticação
cookies.set('auth-token', authResult.token, {
path: '/',
httpOnly: true,
secure: process.env.NODE_ENV === 'production',
sameSite: 'lax',
maxAge: 60 * 60 * 24 // 24 hours
});

// Validar e realizar redirecionamento (fora do try-catch)
const rawRedirectTo = url.searchParams.get('redirectTo') || '/dashboard/';
// Validação de segurança: permitir apenas URLs internas
const isValidRedirect = rawRedirectTo.startsWith('/') && !rawRedirectTo.startsWith('//');
const redirectTo = isValidRedirect ? rawRedirectTo : '/dashboard/';

throw redirect(302, redirectTo);
}
};