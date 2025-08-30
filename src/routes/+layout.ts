import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ fetch, url }) => {
	// Try to get current user if authenticated
	try {
		const response = await fetch('/api/auth/me');
		if (response.ok) {
			const data = await response.json();
			return {
				user: data.user,
				pathname: url.pathname
			};
		}
	} catch (error) {
		// User not authenticated
	}

	return {
		user: null,
		pathname: url.pathname
	};
};