import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	// Delete cookie with all possible configurations to ensure it's removed
	cookies.delete('auth-token', { path: '/' });
	cookies.set('auth-token', '', {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 0 // Expire immediately
	});
	
	console.log('User logged out, cookie cleared'); // Debug log
	
	return json({ success: true });
};