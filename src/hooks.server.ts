import type { Handle } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const handle: Handle = async ({ event, resolve }) => {
	const authCookie = event.cookies.get('auth-token');
	
	if (authCookie) {
		try {
			const token = jwt.verify(authCookie, JWT_SECRET) as any;
			event.locals.user = token;
			console.log('User authenticated:', token.email); // Debug log
		} catch (err) {
			console.error('JWT verification failed:', err); // Debug log
			event.cookies.delete('auth-token', { path: '/' });
		}
	} else {
		console.log('No auth cookie found'); // Debug log
	}

	// Protect routes that require authentication
	if (event.url.pathname.startsWith('/dashboard') || 
		event.url.pathname.startsWith('/customers') ||
		event.url.pathname.startsWith('/products') ||
		event.url.pathname.startsWith('/orders') ||
		event.url.pathname.startsWith('/users')) {
		
		if (!event.locals.user) {
			console.log('Protected route accessed without auth, redirecting to login'); // Debug log
			return new Response('Redirect', {
				status: 302,
				headers: { Location: '/auth/login' }
			});
		}
	}

	// Protect admin routes
	if (event.url.pathname.startsWith('/users')) {
		if (!event.locals.user || event.locals.user.role !== 'ADMIN') {
			return new Response('Forbidden', { status: 403 });
		}
	}

	return resolve(event);
};