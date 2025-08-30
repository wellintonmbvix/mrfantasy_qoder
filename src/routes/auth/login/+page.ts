import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, url }) => {
const { user } = await parent();

console.log('Login page load - user authenticated:', user ? 'Yes' : 'No'); // Debug log

// If already authenticated, redirect to dashboard or the intended page
if (user) {
const redirectTo = url.searchParams.get('redirectTo') || '/dashboard';
console.log('User already authenticated, redirecting to:', redirectTo); // Debug log
throw redirect(302, redirectTo);
}

return {};
};