import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url }) => {
	try {
		const search = url.searchParams.get('search') || '';
		const page = url.searchParams.get('page') || '1';
		
		const response = await fetch(`/api/users?search=${encodeURIComponent(search)}&page=${page}&limit=10`);
		
		if (response.ok) {
			const data = await response.json();
			return {
				users: data.users,
				pagination: data.pagination,
				search
			};
		} else {
			console.error('Error loading users:', await response.text());
			return {
				users: [],
				pagination: { page: 1, limit: 10, total: 0, pages: 0 },
				search: ''
			};
		}
	} catch (error) {
		console.error('Error loading users:', error);
		return {
			users: [],
			pagination: { page: 1, limit: 10, total: 0, pages: 0 },
			search: ''
		};
	}
};