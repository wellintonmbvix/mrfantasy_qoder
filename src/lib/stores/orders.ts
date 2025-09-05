import { writable } from 'svelte/store';

interface OrderItem {
	id: number;
	productId: number;
	quantity: number;
	unitPrice: number;
	discountType?: 'PERCENTAGE' | 'FIXED';
	discountValue?: number;
	totalPrice: number;
	itemType: 'RENTAL' | 'SALE';
	itemTaken: boolean;
	itemReturned: boolean;
	product?: {
		id: number;
		name: string;
		sku: string;
	};
}

interface Order {
	id: number;
	customerId?: number;
	userId: number;
	attendantId?: number;
	orderNumber: string;
	orderType: 'RENTAL' | 'SALE';
	subtotalAmount: number;
	discountType?: 'PERCENTAGE' | 'FIXED';
	discountValue?: number;
	totalAmount: number;
	status: 'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'RETURNED' | 'CANCELLED';
	orderDate: string;
	rentalStartDate?: string;
	rentalEndDate?: string;
	returnDate?: string;
	notes: string;
	createdAt: string;
	updatedAt: string;
	customer?: {
		id: number;
		name: string;
		email: string;
		phone: string;
	};
	user?: {
		id: number;
		username: string;
	};
	attendant?: {
		id: number;
		name: string;
		abbreviation: string;
	};
	orderItems: OrderItem[];
}

interface OrdersState {
	orders: Order[];
	loading: boolean;
	error: string | null;
	pagination: {
		page: number;
		limit: number;
		total: number;
		pages: number;
	} | null;
}

function createOrdersStore() {
	const { subscribe, set, update } = writable<OrdersState>({
		orders: [],
		loading: false,
		error: null,
		pagination: null
	});

	return {
		subscribe,
		fetchOrders: async (params: { 
			search?: string; 
			status?: string;
			orderType?: string;
			page?: number; 
			limit?: number;
		} = {}) => {
			update(state => ({ ...state, loading: true, error: null }));

			try {
				const searchParams = new URLSearchParams();
				if (params.search) searchParams.set('search', params.search);
				if (params.status) searchParams.set('status', params.status);
				if (params.orderType) searchParams.set('orderType', params.orderType);
				if (params.page) searchParams.set('page', params.page.toString());
				if (params.limit) searchParams.set('limit', params.limit.toString());

				const response = await fetch(`/api/orders?${searchParams}`);
				const data = await response.json();

				if (response.ok) {
					update(state => ({
						...state,
						orders: data.orders,
						pagination: data.pagination,
						loading: false
					}));
				} else {
					update(state => ({
						...state,
						error: data.error || 'Erro ao carregar pedidos',
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
		createOrder: async (orderData: {
			customerId?: number;
			attendantId: number;
			orderType: 'RENTAL' | 'SALE';
			orderDate: Date;
			rentalStartDate?: Date;
			rentalEndDate?: Date;
			notes?: string;
			discountType?: 'PERCENTAGE' | 'FIXED';
			discountValue?: number;
			items: Array<{
				productId: number;
				quantity: number;
				unitPrice: number;
				discountType?: 'PERCENTAGE' | 'FIXED';
				discountValue?: number;
				itemType: 'RENTAL' | 'SALE';
				itemTaken?: boolean;
				itemReturned?: boolean;
			}>;
			payments: Array<{
				paymentMethodId: number;
				amount: number;
				notes?: string;
			}>;
		}) => {
			try {
				const response = await fetch('/api/orders', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						...orderData,
						orderDate: orderData.orderDate.toISOString(),
						rentalStartDate: orderData.rentalStartDate?.toISOString(),
						rentalEndDate: orderData.rentalEndDate?.toISOString()
					})
				});

				const data = await response.json();

				if (response.ok) {
					update(state => ({
						...state,
						orders: [data, ...state.orders]
					}));
					return { success: true, order: data };
				} else {
					return { success: false, error: data.error };
				}
			} catch (error) {
				return { success: false, error: 'Erro de conexão' };
			}
		},
		updateOrder: async (id: number, orderData: {
			status?: 'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'RETURNED' | 'CANCELLED';
			attendantId?: number;
			rentalStartDate?: Date;
			rentalEndDate?: Date;
			returnDate?: Date;
			notes?: string;
		}) => {
			try {
				const response = await fetch(`/api/orders/${id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						...orderData,
						rentalStartDate: orderData.rentalStartDate?.toISOString(),
						rentalEndDate: orderData.rentalEndDate?.toISOString(),
						returnDate: orderData.returnDate?.toISOString()
					})
				});

				const data = await response.json();

				if (response.ok) {
					update(state => ({
						...state,
						orders: state.orders.map(order =>
							order.id === id ? data : order
						)
					}));
					return { success: true, order: data };
				} else {
					return { success: false, error: data.error };
				}
			} catch (error) {
				return { success: false, error: 'Erro de conexão' };
			}
		},
		getOrder: async (id: number) => {
			try {
				const response = await fetch(`/api/orders/${id}`);
				const data = await response.json();

				if (response.ok) {
					return { success: true, order: data };
				} else {
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

export const orders = createOrdersStore();