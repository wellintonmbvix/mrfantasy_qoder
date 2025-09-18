import type { Handle } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
// Use process.env for server-side code - $env/static/private is only for some contexts

const JWT_SECRET = process.env.JWT_SECRET || 'suaSenhaMaisFraca@123';

export const handle: Handle = async ({ event, resolve }) => {
	const authCookie = event.cookies.get('auth-token');
	
	
	if (authCookie) {
		try {			
			const token = jwt.verify(authCookie, JWT_SECRET) as any;
			event.locals.user = token;			
		} catch (err) {									
			event.cookies.delete('auth-token', { path: '/' });
			event.locals.user = undefined;
		}
	} else {		
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