import { fail, redirect } from '@sveltejs/kit';
import { AuthService } from '$lib/server/auth.js';
import type { Actions } from './$types';

export const actions: Actions = {
default: async ({ request, cookies, url }) => {
// Clear any existing auth cookies first
cookies.delete('auth-token', { path: '/' });

const data = await request.formData();
const email = data.get('email') as string;
const password = data.get('password') as string;

console.log('Form login attempt for:', email); // Debug log

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
console.log('Form login successful for:', email); // Debug log
} catch (error) {
// Log para debugging em desenvolvimento
console.error('Form login error:', error);

return fail(401, {
error: error instanceof Error ? error.message : 'Erro interno do servidor',
email
});
}

// Configurar cookie de autenticação com configurações mais explícitas
cookies.set('auth-token', authResult.token, {
path: '/',
httpOnly: true,
secure: process.env.NODE_ENV === 'production',
sameSite: 'lax',
maxAge: 60 * 60 * 24, // 24 hours
domain: undefined // Explicitly set to undefined for localhost
});

console.log('Form cookie set for user:', email); // Debug log

// Validar e realizar redirecionamento (fora do try-catch)
const rawRedirectTo = url.searchParams.get('redirectTo') || '/dashboard';
// Validação de segurança: permitir apenas URLs internas
const isValidRedirect = rawRedirectTo.startsWith('/') && !rawRedirectTo.startsWith('//');
const redirectTo = isValidRedirect ? rawRedirectTo : '/dashboard';

console.log('Redirecting to:', redirectTo); // Debug log

throw redirect(302, redirectTo);
}
};