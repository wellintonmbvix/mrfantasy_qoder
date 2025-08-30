import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, url }) => {
const { user } = await parent();

// If already authenticated, redirect to dashboard or the intended page
if (user) {
const redirectTo = url.searchParams.get('redirectTo') || '/dashboard';
throw redirect(302, redirectTo);
}

return {};
};