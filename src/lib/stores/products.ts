import { writable } from 'svelte/store';

interface ProductGroup {
	id: number;
	name: string;
	description?: string;
	category: string;
	createdAt: string;
	updatedAt: string;
	active: boolean;
	_count?: {
		products: number;
	};
}

interface Product {
	id: number;
	name: string;
	description?: string;
	sku: string;
	costPrice: number;
	rentalPrice: number;
	salePrice: number;
	stockQuantity: number;
	size?: string;
	color?: string;
	productType: 'FANTASY' | 'ACCESSORY';
	groupId: number;
	imageUrl?: string;
	createdAt: string;
	updatedAt: string;
	active: boolean;
	availableForRental: boolean;
	availableForSale: boolean;
	group?: ProductGroup;
}

interface ProductsState {
	products: Product[];
	groups: ProductGroup[];
	loading: boolean;
	error: string | null;
	pagination: {
		page: number;
		limit: number;
		total: number;
		pages: number;
	} | null;
}

function createProductsStore() {
	const { subscribe, set, update } = writable<ProductsState>({
		products: [],
		groups: [],
		loading: false,
		error: null,
		pagination: null
	});

	return {
		subscribe,
		fetchProducts: async (params: { 
			search?: string; 
			groupId?: number;
			productType?: string;
			page?: number; 
			limit?: number;
		} = {}) => {
			update(state => ({ ...state, loading: true, error: null }));

			try {
				const searchParams = new URLSearchParams();
				if (params.search) searchParams.set('search', params.search);
				if (params.groupId) searchParams.set('groupId', params.groupId.toString());
				if (params.productType) searchParams.set('productType', params.productType);
				if (params.page) searchParams.set('page', params.page.toString());
				if (params.limit) searchParams.set('limit', params.limit.toString());

				const response = await fetch(`/api/products?${searchParams}`);
				const data = await response.json();

				if (response.ok) {
					update(state => ({
						...state,
						products: data.products,
						pagination: data.pagination,
						loading: false
					}));
				} else {
					update(state => ({
						...state,
						error: data.error || 'Erro ao carregar produtos',
						loading: false
					}));
				}
			} catch (error) {
				update(state => ({
					...state,
					error: 'Erro de conexão',
					loading: false
				}));
			}
		},
		fetchGroups: async (params: { search?: string; category?: string } = {}) => {
			try {
				const searchParams = new URLSearchParams();
				if (params.search) searchParams.set('search', params.search);
				if (params.category) searchParams.set('category', params.category);

				const response = await fetch(`/api/groups?${searchParams}`);
				const data = await response.json();

				if (response.ok) {
					update(state => ({
						...state,
						groups: data
					}));
				}
			} catch (error) {
				console.error('Error fetching groups:', error);
			}
		},
		createProduct: async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'active' | 'group'>) => {
			try {
				const response = await fetch('/api/products', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(productData)
				});

				const data = await response.json();

				if (response.ok) {
					update(state => ({
						...state,
						products: [data, ...state.products]
					}));
					return { success: true, product: data };
				} else {
					return { success: false, error: data.error };
				}
			} catch (error) {
				return { success: false, error: 'Erro de conexão' };
			}
		},
		updateProduct: async (id: number, productData: Partial<Product>) => {
			try {
				const response = await fetch(`/api/products/${id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(productData)
				});

				const data = await response.json();

				if (response.ok) {
					update(state => ({
						...state,
						products: state.products.map(product =>
							product.id === id ? data : product
						)
					}));
					return { success: true, product: data };
				} else {
					return { success: false, error: data.error };
				}
			} catch (error) {
				return { success: false, error: 'Erro de conexão' };
			}
		},
		deleteProduct: async (id: number) => {
			try {
				const response = await fetch(`/api/products/${id}`, {
					method: 'DELETE'
				});

				if (response.ok) {
					update(state => ({
						...state,
						products: state.products.filter(product => product.id !== id)
					}));
					return { success: true };
				} else {
					const data = await response.json();
					return { success: false, error: data.error };
				}
			} catch (error) {
				return { success: false, error: 'Erro de conexão' };
			}
		},
		createGroup: async (groupData: Omit<ProductGroup, 'id' | 'createdAt' | 'updatedAt' | 'active'>) => {
			try {
				const response = await fetch('/api/groups', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(groupData)
				});

				const data = await response.json();

				if (response.ok) {
					update(state => ({
						...state,
						groups: [data, ...state.groups]
					}));
					return { success: true, group: data };
				} else {
					return { success: false, error: data.error };
				}
			} catch (error) {
				return { success: false, error: 'Erro de conexão' };
			}
		},
		updateGroup: async (id: number, groupData: Partial<ProductGroup>) => {
			try {
				const response = await fetch(`/api/groups/${id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(groupData)
				});

				const data = await response.json();

				if (response.ok) {
					update(state => ({
						...state,
						groups: state.groups.map(group =>
							group.id === id ? data : group
						)
					}));
					return { success: true, group: data };
				} else {
					return { success: false, error: data.error };
				}
			} catch (error) {
				return { success: false, error: 'Erro de conexão' };
			}
		},
		deleteGroup: async (id: number) => {
			try {
				const response = await fetch(`/api/groups/${id}`, {
					method: 'DELETE'
				});

				if (response.ok) {
					update(state => ({
						...state,
						groups: state.groups.filter(group => group.id !== id)
					}));
					return { success: true };
				} else {
					const data = await response.json();
					return { success: false, error: data.error };
				}
			} catch (error) {
				return { success: false, error: 'Erro de conexão' };
			}
		},
		clearError: () => {
			update(state => ({ ...state, error: null }));
		}
	};
}

export const products = createProductsStore();