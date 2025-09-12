import { writable } from 'svelte/store';
import { goto } from '$app/navigation';

// Tipos para transações de caixa
export type CashTransactionType = 'FUND' | 'WITHDRAWAL' | 'SUPPLY' | 'SURPLUS';
export type CashTransactionStatus = 'ACTIVE' | 'CANCELLED';

export interface CashTransaction {
	id: number;
	type: CashTransactionType;
	amount: number;
	description?: string;
	userId: number;
	status: CashTransactionStatus;
	cancelledAt?: Date | string;
	cancelledBy?: number;
	cancelReason?: string;
	createdAt: Date | string;
	updatedAt: Date | string;
	user: {
		id: number;
		username: string;
		email: string;
	};
	cancelledByUser?: {
		id: number;
		username: string;
		email: string;
	};
}

export interface CashTransactionFilters {
	page: number;
	limit: number;
	userId?: number;
	type?: CashTransactionType;
	status?: CashTransactionStatus | 'ALL';
	startDate?: string;
	endDate?: string;
}

export interface CashTransactionPagination {
	page: number;
	limit: number;
	total: number;
	pages: number;
}

export interface CashTransactionCreate {
	type: CashTransactionType;
	amount: number;
	description?: string;
}

// Estado do store
interface CashTransactionState {
	transactions: CashTransaction[];
	currentTransaction: CashTransaction | null;
	pagination: CashTransactionPagination | null;
	filters: CashTransactionFilters;
	cashPaymentsSum: number; // Soma dos pagamentos em dinheiro do período
	loading: boolean;
	error: string | null;
}

// Estado inicial
const initialState: CashTransactionState = {
	transactions: [],
	currentTransaction: null,
	pagination: null,
	filters: {
		page: 1,
		limit: 10,
		status: 'ACTIVE'
	},
	cashPaymentsSum: 0,
	loading: false,
	error: null
};

// Store principal
export const cashTransactions = writable<CashTransactionState>(initialState);

// Funções auxiliares
function setLoading(loading: boolean) {
	cashTransactions.update(state => ({ ...state, loading, error: null }));
}

function setError(error: string) {
	cashTransactions.update(state => ({ ...state, error, loading: false }));
}

// Mapeamento de tipos para display
export const transactionTypeLabels: Record<CashTransactionType, string> = {
	FUND: 'Fundo de Caixa',
	WITHDRAWAL: 'Sangria',
	SUPPLY: 'Suprimento',
	SURPLUS: 'Sobra de Caixa'
};

// Mapeamento de tipos para crédito/débito
export const transactionTypeOperations: Record<CashTransactionType, 'CREDIT' | 'DEBIT'> = {
	FUND: 'CREDIT',
	WITHDRAWAL: 'DEBIT',
	SUPPLY: 'CREDIT',
	SURPLUS: 'CREDIT'
};

// Ações do store
export const cashTransactionActions = {
	// Buscar transações com filtros
	async fetchTransactions(filters?: Partial<CashTransactionFilters>) {
		setLoading(true);

		try {
			const currentState = { ...initialState.filters };
			cashTransactions.update(state => ({
				...state,
				filters: { ...state.filters, ...filters }
			}));

			const updatedFilters = { ...currentState, ...filters };
			const searchParams = new URLSearchParams();

			Object.entries(updatedFilters).forEach(([key, value]) => {
				if (value !== undefined && value !== null && value !== '') {
					searchParams.append(key, value.toString());
				}
			});

			const response = await fetch(`/api/cash-transactions?${searchParams}`);
			
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Erro ao buscar transações');
			}

			const data = await response.json();

			cashTransactions.update(state => ({
				...state,
				transactions: data.transactions || [],
				pagination: data.pagination,
				cashPaymentsSum: Number(data.cashPaymentsSum) || 0,
				loading: false,
				error: null
			}));
		} catch (error) {
			console.error('Erro ao buscar transações:', error);
			setError(error instanceof Error ? error.message : 'Erro ao buscar transações');
		}
	},

	// Buscar transação específica
	async fetchTransaction(id: number) {
		setLoading(true);

		try {
			const response = await fetch(`/api/cash-transactions/${id}`);
			
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Erro ao buscar transação');
			}

			const transaction = await response.json();

			cashTransactions.update(state => ({
				...state,
				currentTransaction: transaction,
				loading: false,
				error: null
			}));

			return transaction;
		} catch (error) {
			console.error('Erro ao buscar transação:', error);
			setError(error instanceof Error ? error.message : 'Erro ao buscar transação');
			throw error;
		}
	},

	// Criar nova transação
	async createTransaction(data: CashTransactionCreate) {
		setLoading(true);

		try {
			const response = await fetch('/api/cash-transactions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Erro ao criar transação');
			}

			const newTransaction = await response.json();

			// Adicionar a nova transação à lista
			cashTransactions.update(state => ({
				...state,
				transactions: [newTransaction, ...state.transactions],
				loading: false,
				error: null
			}));

			return newTransaction;
		} catch (error) {
			console.error('Erro ao criar transação:', error);
			setError(error instanceof Error ? error.message : 'Erro ao criar transação');
			throw error;
		}
	},

	// Cancelar transação
	async cancelTransaction(id: number, cancelReason: string) {
		setLoading(true);

		try {
			const response = await fetch(`/api/cash-transactions/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ cancelReason })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Erro ao cancelar transação');
			}

			const cancelledTransaction = await response.json();

			// Atualizar a transação na lista
			cashTransactions.update(state => ({
				...state,
				transactions: state.transactions.map(t => 
					t.id === id ? cancelledTransaction : t
				),
				currentTransaction: state.currentTransaction?.id === id 
					? cancelledTransaction 
					: state.currentTransaction,
				loading: false,
				error: null
			}));

			return cancelledTransaction;
		} catch (error) {
			console.error('Erro ao cancelar transação:', error);
			setError(error instanceof Error ? error.message : 'Erro ao cancelar transação');
			throw error;
		}
	},

	// Limpar erro
	clearError() {
		cashTransactions.update(state => ({ ...state, error: null }));
	},

	// Resetar filtros
	resetFilters() {
		cashTransactions.update(state => ({
			...state,
			filters: { ...initialState.filters }
		}));
	},

	// Definir filtros
	setFilters(filters: Partial<CashTransactionFilters>) {
		cashTransactions.update(state => ({
			...state,
			filters: { ...state.filters, ...filters }
		}));
	}
};