import type { Handle } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
// Use process.env for server-side code - $env/static/private is only for some contexts

const JWT_SECRET = process.env.JWT_SECRET || 'suaSenhaMaisFraca@123';

export const handle: Handle = async ({ event, resolve }) => {
	const authCookie = event.cookies.get('auth-token');
	
	console.log('Hook called for:', event.url.pathname); // Debug log
	console.log('Auth cookie present:', !!authCookie); // Debug log
	console.log('JWT_SECRET length:', JWT_SECRET?.length || 0); // Debug log
	if (authCookie) {
		console.log('Cookie value length:', authCookie.length); // Debug log
	}
	
	if (authCookie) {
		try {
			console.log('Attempting to verify token...'); // Debug log
			const token = jwt.verify(authCookie, JWT_SECRET) as any;
			event.locals.user = token;
			console.log('User authenticated:', token.email); // Debug log
		} catch (err) {
			console.error('JWT verification failed:', err); // Debug log
			console.error('Token (first 50 chars):', authCookie?.substring(0, 50)); // Debug log
			console.error('JWT_SECRET (first 20 chars):', JWT_SECRET?.substring(0, 20)); // Debug log
			event.cookies.delete('auth-token', { path: '/' });
			event.locals.user = undefined;
		}
	} else {
		console.log('No auth cookie found'); // Debug log
		event.locals.user = undefined;
	}

	// Protect routes that require authentication
	if (event.url.pathname.startsWith('/dashboard') || 
		event.url.pathname.startsWith('/customers') ||
		event.url.pathname.startsWith('/products') ||
		event.url.pathname.startsWith('/orders') ||
		event.url.pathname.startsWith('/users') ||
		event.url.pathname.startsWith('/employees') ||
		event.url.pathname.startsWith('/company') ||
		event.url.pathname.startsWith('/settings')) {
		
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

	// Protect employees route (Admin and Manager only)
	if (event.url.pathname.startsWith('/employees')) {
		if (!event.locals.user || (event.locals.user.role !== 'ADMIN' && event.locals.user.role !== 'MANAGER')) {
			return new Response('Forbidden', { status: 403 });
		}
	}

	// Protect company route (Admin and Manager only)
	if (event.url.pathname.startsWith('/company')) {
		if (!event.locals.user || (event.locals.user.role !== 'ADMIN' && event.locals.user.role !== 'MANAGER')) {
			return new Response('Forbidden', { status: 403 });
		}
	}

	// Protect settings route (Admin and Manager only)
	if (event.url.pathname.startsWith('/settings')) {
		if (!event.locals.user || (event.locals.user.role !== 'ADMIN' && event.locals.user.role !== 'MANAGER')) {
			return new Response('Forbidden', { status: 403 });
		}
	}

	return resolve(event);
};