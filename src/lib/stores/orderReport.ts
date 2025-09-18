import { writable } from 'svelte/store';

// Interfaces para o relatório de pedidos
interface OrderReportItem {
	id: number;
	product: {
		id: number;
		name: string;
		sku: string;
	};
	quantity: number;
	unitPrice: number;
	discountType?: 'PERCENTAGE' | 'FIXED';
	discountValue: number;
	surchargeType?: 'PERCENTAGE' | 'FIXED';
	surchargeValue: number;
	totalPrice: number;
	itemType: 'RENTAL' | 'SALE';
	itemTaken: boolean;
	itemReturned: boolean;
	status: 'PENDENTE' | 'RETIRADO' | 'RETORNADO';
	saleInfo?: string;
}

interface OrderReportPayment {
	id: number;
	paymentMethod: {
		id: number;
		name: string;
	};
	amount: number;
	notes?: string;
}

interface OrderReportData {
	id: number;
	orderNumber: string;
	orderDate: string;
	customer?: {
		id: number;
		name: string;
		phone: string;
		email: string;
	};
	attendant?: {
		id: number;
		name: string;
		abbreviation: string;
	};
	status: string;
	subtotalAmount: number;
	discountType?: 'PERCENTAGE' | 'FIXED';
	discountValue: number;
	surchargeType?: 'PERCENTAGE' | 'FIXED';
	surchargeValue: number;
	totalAmount: number;
	notes?: string;
	itemsSubtotal: number;
	itemsDiscount: number;
	itemsTotal: number;
	totalQuantity: number;
	orderItems: OrderReportItem[];
	orderPayments: OrderReportPayment[];
}

interface OrderReportSummary {
	totalOrders: number;
	totalAmount: number;
	totalItems: number;
	totalDiscount: number;
	paymentMethodTotals: Record<string, number>;
}

interface OrderReportFilters {
	dateFrom: string;
	dateTo: string;
	customerId: string;
	attendantId: string;
}

interface OrderReportPagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}

interface OrderReportState {
	data: OrderReportData[];
	summary: OrderReportSummary | null;
	pagination: OrderReportPagination;
	filters: OrderReportFilters;
	loading: boolean;
	error: string | null;
}

// Estado inicial
const initialState: OrderReportState = {
	data: [],
	summary: null,
	pagination: {
		page: 1,
		limit: 50,
		total: 0,
		totalPages: 0,
		hasNext: false,
		hasPrev: false
	},
	filters: {
		dateFrom: '',
		dateTo: '',
		customerId: '',
		attendantId: ''
	},
	loading: false,
	error: null
};

// Store principal
export const orderReportStore = writable<OrderReportState>(initialState);

// Ações para o store
export const orderReportActions = {
	// Definir filtros
	setFilters: (filters: Partial<OrderReportFilters>) => {
		orderReportStore.update((state: OrderReportState) => ({
			...state,
			filters: { ...state.filters, ...filters },
			pagination: { ...state.pagination, page: 1 } // Reset para primeira página
		}));
	},

	// Limpar filtros
	clearFilters: () => {
		orderReportStore.update((state: OrderReportState) => ({
			...state,
			filters: {
				dateFrom: '',
				dateTo: '',
				customerId: '',
				attendantId: ''
			},
			pagination: { ...state.pagination, page: 1 }
		}));
	},

	// Definir página
	setPage: (page: number) => {
		orderReportStore.update((state: OrderReportState) => ({
			...state,
			pagination: { ...state.pagination, page }
		}));
	},

	// Carregar relatório
	loadReport: async () => {
		orderReportStore.update((state: OrderReportState) => ({
			...state,
			loading: true,
			error: null
		}));

		try {
			let currentState: OrderReportState;
			const unsubscribe = orderReportStore.subscribe((state: OrderReportState) => {
				currentState = state;
			});
			unsubscribe();

			// Construir parâmetros de consulta
			const searchParams = new URLSearchParams();
			
			if (currentState!.filters.dateFrom) searchParams.set('dateFrom', currentState!.filters.dateFrom);
			if (currentState!.filters.dateTo) searchParams.set('dateTo', currentState!.filters.dateTo);
			if (currentState!.filters.customerId) searchParams.set('customerId', currentState!.filters.customerId);
			if (currentState!.filters.attendantId) searchParams.set('attendantId', currentState!.filters.attendantId);
			searchParams.set('page', currentState!.pagination.page.toString());
			searchParams.set('limit', currentState!.pagination.limit.toString());

			const response = await fetch(`/api/orders/report?${searchParams}`);
			
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Erro ao carregar relatório');
			}

			const result = await response.json();
			
			if (result.success) {
				orderReportStore.update((state: OrderReportState) => ({
					...state,
					data: result.data,
					summary: result.summary,
					pagination: result.pagination,
					loading: false,
					error: null
				}));
			} else {
				throw new Error(result.error || 'Erro desconhecido');
			}

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Erro de conexão';
			orderReportStore.update((state: OrderReportState) => ({
				...state,
				loading: false,
				error: errorMessage
			}));
		}
	},

	// Resetar estado
	reset: () => {
		orderReportStore.set(initialState);
	}
};

// Exportar tipos para uso externo
export type { 
	OrderReportData, 
	OrderReportItem, 
	OrderReportPayment, 
	OrderReportSummary, 
	OrderReportFilters, 
	OrderReportPagination,
	OrderReportState 
};