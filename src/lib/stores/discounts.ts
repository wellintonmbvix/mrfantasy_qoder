import { writable, derived } from 'svelte/store';
import { calculateDiscount, applyDiscount, distributeOrderDiscount, calculateSurcharge, applySurcharge, distributeOrderSurcharge } from '$lib/utils/validation.js';

export interface OrderItemDiscount {
	id?: number;
	productId: number;
	quantity: number;
	unitPrice: number;
	discountType?: 'PERCENTAGE' | 'FIXED';
	discountValue?: number;
	surchargeType?: 'PERCENTAGE' | 'FIXED';
	surchargeValue?: number;
	itemType: 'RENTAL' | 'SALE';
}

export interface OrderDiscount {
	discountType?: 'PERCENTAGE' | 'FIXED';
	discountValue?: number;
	surchargeType?: 'PERCENTAGE' | 'FIXED';
	surchargeValue?: number;
	items: OrderItemDiscount[];
}

function createOrderCalculatorStore() {
	const { subscribe, set, update } = writable<OrderDiscount>({
		items: []
	});

	return {
		subscribe,
		setItems: (items: OrderItemDiscount[]) => {
			update(state => ({ ...state, items }));
		},
		addItem: (item: OrderItemDiscount) => {
			update(state => ({
				...state,
				items: [...state.items, item]
			}));
		},
		updateItem: (index: number, item: Partial<OrderItemDiscount>) => {
			update(state => ({
				...state,
				items: state.items.map((existingItem, i) => 
					i === index ? { ...existingItem, ...item } : existingItem
				)
			}));
		},
		removeItem: (index: number) => {
			update(state => ({
				...state,
				items: state.items.filter((_, i) => i !== index)
			}));
		},
		setOrderDiscount: (discountType?: 'PERCENTAGE' | 'FIXED', discountValue?: number) => {
			update(state => ({ ...state, discountType, discountValue }));
		},
		setOrderSurcharge: (surchargeType?: 'PERCENTAGE' | 'FIXED', surchargeValue?: number) => {
			update(state => ({ ...state, surchargeType, surchargeValue }));
		},
		clearOrderDiscount: () => {
			update(state => ({ ...state, discountType: undefined, discountValue: undefined }));
		},
		clearOrderSurcharge: () => {
			update(state => ({ ...state, surchargeType: undefined, surchargeValue: undefined }));
		},
		reset: () => {
			set({ items: [] });
		}
	};
}

export const orderCalculator = createOrderCalculatorStore();

// Derived store para calcular totais automaticamente
export const orderTotals = derived(orderCalculator, ($orderCalculator) => {
	const items = $orderCalculator.items;
	const orderDiscountType = $orderCalculator.discountType;
	const orderDiscountValue = $orderCalculator.discountValue;
	const orderSurchargeType = $orderCalculator.surchargeType;
	const orderSurchargeValue = $orderCalculator.surchargeValue;

	// Calcular subtotal (sem descontos)
	const subtotal = items.reduce((sum, item) => {
		return sum + (item.unitPrice * item.quantity);
	}, 0);

	// Aplicar descontos e acréscimos por item
	let itemsWithDiscounts = items.map(item => {
		const itemSubtotal = item.unitPrice * item.quantity;
		let itemDiscount = 0;
		let itemSurcharge = 0;
		let itemTotal = itemSubtotal;

		if (item.discountType && item.discountValue) {
			itemDiscount = calculateDiscount(itemSubtotal, item.discountType, item.discountValue);
			itemTotal = applyDiscount(itemSubtotal, item.discountType, item.discountValue);
		}

		if (item.surchargeType && item.surchargeValue) {
			itemSurcharge = calculateSurcharge(itemTotal, item.surchargeType, item.surchargeValue);
			itemTotal = applySurcharge(itemTotal, item.surchargeType, item.surchargeValue);
		}

		return {
			...item,
			subtotal: itemSubtotal,
			discountAmount: itemDiscount,
			surchargeAmount: itemSurcharge,
			total: itemTotal
		};
	});

	// Aplicar desconto e acréscimo do pedido
	let orderDiscountAmount = 0;
	let orderSurchargeAmount = 0;
	let finalTotal = subtotal;

	if (orderDiscountType && orderDiscountValue) {
		// Se há desconto no pedido, distribuir pelos itens
		const distributedDiscounts = distributeOrderDiscount(
			items,
			orderDiscountType,
			orderDiscountValue
		);

		itemsWithDiscounts = itemsWithDiscounts.map((item, index) => {
			const distributedDiscount = distributedDiscounts[index];
			const additionalDiscount = calculateDiscount(
				item.subtotal,
				distributedDiscount.discountType,
				distributedDiscount.discountValue
			);

			return {
				...item,
				discountAmount: item.discountAmount + additionalDiscount,
				total: item.total - additionalDiscount
			};
		});

		orderDiscountAmount = calculateDiscount(subtotal, orderDiscountType, orderDiscountValue);
		finalTotal = applyDiscount(subtotal, orderDiscountType, orderDiscountValue);
	} else {
		// Se não há desconto no pedido, somar os totais dos itens
		finalTotal = itemsWithDiscounts.reduce((sum, item) => sum + item.total, 0);
		orderDiscountAmount = itemsWithDiscounts.reduce((sum, item) => sum + item.discountAmount, 0);
	}

	if (orderSurchargeType && orderSurchargeValue) {
		// Se há acréscimo no pedido, distribuir pelos itens
		const distributedSurcharges = distributeOrderSurcharge(
			items,
			orderSurchargeType,
			orderSurchargeValue
		);

		itemsWithDiscounts = itemsWithDiscounts.map((item, index) => {
			const distributedSurcharge = distributedSurcharges[index];
			const additionalSurcharge = calculateSurcharge(
				item.total,
				distributedSurcharge.surchargeType,
				distributedSurcharge.surchargeValue
			);

			return {
				...item,
				surchargeAmount: (item.surchargeAmount || 0) + additionalSurcharge,
				total: item.total + additionalSurcharge
			};
		});

		orderSurchargeAmount = calculateSurcharge(finalTotal, orderSurchargeType, orderSurchargeValue);
		finalTotal = applySurcharge(finalTotal, orderSurchargeType, orderSurchargeValue);
	} else {
		// Se não há acréscimo no pedido, somar os totais dos itens
		finalTotal = itemsWithDiscounts.reduce((sum, item) => sum + item.total, 0);
		orderSurchargeAmount = itemsWithDiscounts.reduce((sum, item) => sum + (item.surchargeAmount || 0), 0);
	}

	return {
		subtotal,
		orderDiscountAmount,
		orderSurchargeAmount,
		totalDiscountAmount: orderDiscountAmount,
		totalSurchargeAmount: orderSurchargeAmount,
		total: finalTotal,
		itemsWithDiscounts
	};
});

// Store para modo de desconto (por item ou total)
export const discountMode = writable<'item' | 'order'>('item');

// Função utilitária para formatar valores monetários
export function formatCurrency(value: number): string {
	return new Intl.NumberFormat('pt-BR', {
		style: 'currency',
		currency: 'BRL'
	}).format(value);
}

// Função utilitária para validar desconto percentual
export function validatePercentageDiscount(value: number): boolean {
	return value >= 0 && value <= 100;
}

// Função utilitária para validar desconto fixo
export function validateFixedDiscount(value: number, maxValue: number): boolean {
	return value >= 0 && value <= maxValue;
}