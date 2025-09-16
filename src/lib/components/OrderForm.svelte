<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { customers } from '$lib/stores/customers.js';
	import { products } from '$lib/stores/products.js';
	import { employees } from '$lib/stores/employees.js';
	import { notificationStore } from '$lib/stores/notifications.js';
	import { calculateDiscount, applyDiscount, distributeOrderDiscount, calculateSurcharge, applySurcharge, distributeOrderSurcharge } from '$lib/utils/validation.js';
	
	const dispatch = createEventDispatcher();
	
	// Active tab
	let activeTab: 'items' | 'order' = 'items';
	
	let selectedCustomerId = '';
	let selectedAttendantId = '';
	let orderDate = new Date().toISOString().split('T')[0];
	let rentalStartDate = '';
	let rentalEndDate = '';
	let notes = '';
	
	// Order-level discount fields
	let orderDiscountType: 'PERCENTAGE' | 'FIXED' | '' = '';
	let orderDiscountValue: number = 0;
	
	// Order-level surcharge fields
	let orderSurchargeType: 'PERCENTAGE' | 'FIXED' | '' = '';
	let orderSurchargeValue: number = 0;
	
	let orderItems: Array<{
		productId: number;
		product?: any;
		quantity: number;
		unitPrice: number;
		itemType: 'RENTAL' | 'SALE';
		// Item-level discount fields
		discountType?: 'PERCENTAGE' | 'FIXED' | '';
		discountValue?: number;
		// Item-level surcharge fields
		surchargeType?: 'PERCENTAGE' | 'FIXED' | '';
		surchargeValue?: number;
	}> = [];
	
	// Payment methods data
	let paymentMethods: any[] = [];
	let orderPayments: Array<{
		paymentMethodId: number;
		paymentMethod?: any;
		amount: number;
		notes?: string;
	}> = [];
	let showPaymentDropdown = false;
	let selectedPaymentMethodId = '';
	
	let errors: Record<string, string> = {};
	let loading = false;
	let searchingCustomers = false;
	let searchingProducts = false;
	let customerSearch = '';
	let productSearch = '';
	let customersList: any[] = [];
	let employeesList: any[] = [];
	let productsList: any[] = [];
	let showCustomerDropdown = false;
	let showProductDropdown = false;
	
	// Settings
	let settings: any = null;
	let surchargeEnabled = false;
	
	// Dropdown references for click outside detection
	let productDropdownRef: HTMLElement;
	let customerDropdownRef: HTMLElement;
	
	// Selected indices for keyboard navigation
	let productSelectedIndex = -1;
	let customerSelectedIndex = -1;
	
	// Reactive declarations
	let customersData: any;
	let employeesData: any;
	let productsData: any;
	let subtotalAmount: number;
	let totalAmount: number;
	let totalPayments: number;
	let paymentBalance: number;
	let hasRentalItems: boolean;
	let rentalDays: number;
	
	$: {
		customersData = $customers;
		employeesData = $employees;
		productsData = $products;
		
		// Calculate subtotal (before order discount and surcharge)
		subtotalAmount = orderItems.reduce((sum, item) => {
			const itemSubtotal = item.quantity * item.unitPrice;
			const itemDiscountType = item.discountType as 'PERCENTAGE' | 'FIXED' | undefined;
			const itemDiscountValue = item.discountValue || 0;
			const itemSurchargeType = item.surchargeType as 'PERCENTAGE' | 'FIXED' | undefined;
			const itemSurchargeValue = item.surchargeValue || 0;
			
			let itemTotal = itemSubtotal;
			
			if (itemDiscountType && itemDiscountValue > 0) {
				itemTotal = applyDiscount(itemTotal, itemDiscountType, itemDiscountValue);
			}
			
			if (itemSurchargeType && itemSurchargeValue > 0) {
				itemTotal = applySurcharge(itemTotal, itemSurchargeType, itemSurchargeValue);
			}
			
			return sum + itemTotal;
		}, 0);
		
		// Calculate total amount (after order discount and surcharge)
		totalAmount = subtotalAmount;
		
		if (orderDiscountType && orderDiscountValue > 0) {
			totalAmount = applyDiscount(totalAmount, orderDiscountType as 'PERCENTAGE' | 'FIXED', orderDiscountValue);
		}
		
		if (orderSurchargeType && orderSurchargeValue > 0) {
			totalAmount = applySurcharge(totalAmount, orderSurchargeType as 'PERCENTAGE' | 'FIXED', orderSurchargeValue);
		}
		
		totalPayments = orderPayments.reduce((sum, payment) => sum + payment.amount, 0);
		paymentBalance = totalAmount - totalPayments;
		hasRentalItems = orderItems.some(item => item.itemType === 'RENTAL');
		rentalDays = rentalStartDate && rentalEndDate 
			? Math.ceil((new Date(rentalEndDate).getTime() - new Date(rentalStartDate).getTime()) / (1000 * 60 * 60 * 24))
			: 0;
	}
	
	onMount(() => {
		loadInitialData();
		
		// Add global click listener to close dropdowns when clicking outside
		function handleClickOutside(event: MouseEvent) {
			const target = event.target as Element;
			
			// Check if clicked element is inside any dropdown or its trigger
			const isInsideProductDropdown = productDropdownRef && productDropdownRef.contains(target);
			const isInsideCustomerDropdown = customerDropdownRef && customerDropdownRef.contains(target);
			
			// Close product dropdown if click is outside and dropdown is open
			if (showProductDropdown && !isInsideProductDropdown) {
				showProductDropdown = false;
				productSelectedIndex = -1;
			}
			
			// Close customer dropdown if click is outside and dropdown is open
			if (showCustomerDropdown && !isInsideCustomerDropdown) {
				showCustomerDropdown = false;
				customerSelectedIndex = -1;
			}
		}
		
		// Add global keydown listener to close dropdowns on ESC
		function handleKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				// Close dropdowns first before allowing modal to close
				if (showProductDropdown || showCustomerDropdown) {
					showProductDropdown = false;
					showCustomerDropdown = false;
					event.stopPropagation(); // Prevent modal from closing
				}
			}
		}
		
		document.addEventListener('click', handleClickOutside, true); // Use capture phase
		document.addEventListener('keydown', handleKeydown, true); // Use capture phase
		
		// Cleanup function
		return () => {
			document.removeEventListener('click', handleClickOutside, true);
			document.removeEventListener('keydown', handleKeydown, true);
		};
	});
	
	async function loadInitialData() {
		await Promise.all([
			customers.fetch({ limit: 50 }),
			employees.fetch({ limit: 50 }),
			products.fetchProducts({ limit: 50 }),
			products.fetchGroups(),
			loadPaymentMethods(),
			loadSettings()
		]);
		customersList = customersData.customers;
		employeesList = employeesData.employees || [];
		productsList = productsData.products;
	}
	
	async function loadPaymentMethods() {
		try {
			const response = await fetch('/api/payment-methods?active=true&limit=100');
			const data = await response.json();
			if (response.ok) {
				paymentMethods = data.paymentMethods || [];
			}
		} catch (error) {
			console.error('Error loading payment methods:', error);
		}
	}
	
	async function loadSettings() {
		try {
			const response = await fetch('/api/settings');
			const data = await response.json();
			if (response.ok && data.settings) {
				settings = data.settings;
				// CORRIGIDO: campos habilitados quando inhibit_surcharge = true
				surchargeEnabled = settings.inhibitSurcharge;
			} else {
				surchargeEnabled = false;
			}
		} catch (error) {
			console.error('Error loading settings:', error);
			// Default to disabled if can't load settings
			surchargeEnabled = false;
		}
	}
	
	async function searchCustomers() {
		if (customerSearch.length < 2) {
			showCustomerDropdown = false;
			customerSelectedIndex = -1;
			return;
		}
		
		searchingCustomers = true;
		await customers.fetch({ search: customerSearch, limit: 20 });
		customersList = customersData.customers;
		searchingCustomers = false;
		showCustomerDropdown = true;
		customerSelectedIndex = -1;
	}
	
	async function searchProducts() {
		if (productSearch.length < 2) {
			showProductDropdown = false;
			productSelectedIndex = -1;
			return;
		}
		
		searchingProducts = true;
		await products.fetchProducts({ search: productSearch, limit: 20 });
		productsList = productsData.products;
		searchingProducts = false;
		showProductDropdown = true;
		productSelectedIndex = -1;
	}
	
	function selectCustomer(customer: any) {
		selectedCustomerId = customer.id.toString();
		customerSearch = customer.name;
		showCustomerDropdown = false;
		customerSelectedIndex = -1;
	}
	
	function addProduct(product: any) {
		const allowNegativeStock = settings?.allowNegativeStock || false;
		const existingIndex = orderItems.findIndex(item => item.productId === product.id);
		
		if (existingIndex >= 0) {
			// If adding to existing item, check if new quantity would exceed stock
			const newQuantity = orderItems[existingIndex].quantity + 1;
			if (newQuantity > product.stockQuantity && !allowNegativeStock) {
				notificationStore.error(
					`Não é possível aumentar a quantidade de ${product.name}. Estoque atual: ${product.stockQuantity}. Para permitir estoque negativo, habilite a opção em Configurações.`,
					8000
				);
				return;
			}
			
			// Show warning if stock will be negative but allowed
			if (newQuantity > product.stockQuantity && allowNegativeStock) {
				notificationStore.warning(
					`Atenção: Aumentando quantidade de ${product.name}. Estoque atual: ${product.stockQuantity}. Permitido por configuração.`,
					6000
				);
			}
			
			orderItems[existingIndex].quantity = newQuantity;
		} else {
			// Adding new product - check if stock is available
			if (product.stockQuantity <= 0 && !allowNegativeStock) {
				notificationStore.error(
					`Não é possível adicionar ${product.name}. Estoque atual: ${product.stockQuantity}. Para permitir estoque negativo, habilite a opção em Configurações.`,
					8000
				);
				return; // Prevent adding the product
			}
			
			// Show warning if adding product with zero/negative stock but allowed
			if (product.stockQuantity <= 0 && allowNegativeStock) {
				notificationStore.warning(
					`Atenção: ${product.name} possui estoque ${product.stockQuantity}. Adição permitida por configuração.`,
					6000
				);
			}
			
			// Se o produto está disponível para ambos (venda e aluguel), usar o tipo aluguel como padrão
			// Se está disponível apenas para um, usar o tipo disponível
			let defaultItemType: 'RENTAL' | 'SALE';
			if (product.availableForRental && product.availableForSale) {
				defaultItemType = 'RENTAL'; // Default para aluguel
			} else if (product.availableForRental) {
				defaultItemType = 'RENTAL';
			} else {
				defaultItemType = 'SALE';
			}
			
			const defaultPrice = defaultItemType === 'RENTAL' ? product.rentalPrice : product.salePrice;
			
			orderItems = [...orderItems, {
				productId: product.id,
				product: product,
				quantity: 1,
				unitPrice: defaultPrice,
				itemType: defaultItemType,
				discountType: '',
				discountValue: 0,
				surchargeType: '',
				surchargeValue: 0
			}];
		}
		
		productSearch = '';
		showProductDropdown = false;
		productSelectedIndex = -1;
	}
	
	function removeItem(index: number) {
		orderItems = orderItems.filter((_, i) => i !== index);
	}
	
	function updateItemQuantity(index: number, quantity: number) {
		if (quantity <= 0) {
			removeItem(index);
			return;
		}
		
		const item = orderItems[index];
		if (item.product && quantity > item.product.stockQuantity) {
			const allowNegativeStock = settings?.allowNegativeStock || false;
			
			if (!allowNegativeStock) {
				notificationStore.error(
					`Quantidade não pode exceder o estoque de ${item.product.name}. Estoque atual: ${item.product.stockQuantity}.`,
					8000
				);
				// Manter a quantidade anterior
				return;
			} else {
				if (item.product.stockQuantity <= 0) {
					notificationStore.warning(
						`Atenção: ${item.product.name} possui estoque ${item.product.stockQuantity}. Quantidade permitida por configuração.`,
						6000
					);
				}
			}
		}
		
		orderItems[index].quantity = quantity;
	}
	
	function updateItemPrice(index: number, price: number) {
		// Ensure price is a valid number
		const validPrice = isNaN(price) ? 0 : price;
		orderItems[index].unitPrice = validPrice;
	}
	
	// Discount functions
	function updateItemDiscountType(index: number, discountType: string) {
		orderItems[index].discountType = discountType as 'PERCENTAGE' | 'FIXED' | '';
		if (!discountType) {
			orderItems[index].discountValue = 0;
		}
	}
	
	function updateItemDiscountValue(index: number, discountValue: number) {
		const validValue = isNaN(discountValue) ? 0 : Math.max(0, discountValue);
		orderItems[index].discountValue = validValue;
	}

	// Surcharge functions
	function updateItemSurchargeType(index: number, surchargeType: string) {
		orderItems[index].surchargeType = surchargeType as 'PERCENTAGE' | 'FIXED' | '';
		if (!surchargeType) {
			orderItems[index].surchargeValue = 0;
		}
	}
	
	function updateItemSurchargeValue(index: number, surchargeValue: number) {
		const validValue = isNaN(surchargeValue) ? 0 : Math.max(0, surchargeValue);
		orderItems[index].surchargeValue = validValue;
	}

	function updateItemType(index: number, itemType: 'RENTAL' | 'SALE') {
		const item = orderItems[index];
		if (!item.product) return;
		
		// Atualizar tipo do item
		orderItems[index].itemType = itemType;
		
		// Atualizar preço unitário baseado no novo tipo
		const newPrice = itemType === 'RENTAL' ? item.product.rentalPrice : item.product.salePrice;
		orderItems[index].unitPrice = newPrice;
	}

	function canChangeItemType(product: any): boolean {
		// Produto pode mudar tipo apenas se estiver disponível para ambos: venda e aluguel
		return product && product.availableForRental && product.availableForSale;
	}
	
	function applyOrderDiscountToItems() {
		if (!orderDiscountType || orderDiscountValue <= 0) return;
		
		const itemsForDistribution = orderItems.map(item => ({
			unitPrice: item.unitPrice,
			quantity: item.quantity
		}));
		
		const distributedDiscounts = distributeOrderDiscount(
			itemsForDistribution, 
			orderDiscountType as 'PERCENTAGE' | 'FIXED', 
			orderDiscountValue
		);
		
		orderItems = orderItems.map((item, index) => ({
			...item,
			discountType: distributedDiscounts[index].discountType,
			discountValue: distributedDiscounts[index].discountValue
		}));
		
		// Clear order-level discount after distribution
		orderDiscountType = '';
		orderDiscountValue = 0;
	}
	
	function applyOrderSurchargeToItems() {
		if (!orderSurchargeType || orderSurchargeValue <= 0) return;
		
		const itemsForDistribution = orderItems.map(item => ({
			unitPrice: item.unitPrice,
			quantity: item.quantity
		}));
		
		const distributedSurcharges = distributeOrderSurcharge(
			itemsForDistribution, 
			orderSurchargeType as 'PERCENTAGE' | 'FIXED', 
			orderSurchargeValue
		);
		
		orderItems = orderItems.map((item, index) => ({
			...item,
			surchargeType: distributedSurcharges[index].surchargeType,
			surchargeValue: distributedSurcharges[index].surchargeValue
		}));
		
		// Clear order-level surcharge after distribution
		orderSurchargeType = '';
		orderSurchargeValue = 0;
	}
	
	function addPayment() {
		if (!selectedPaymentMethodId) return;
		
		const paymentMethod = paymentMethods.find(pm => pm.id === parseInt(selectedPaymentMethodId));
		if (!paymentMethod) return;
		
		// Check if payment method already exists
		const existingIndex = orderPayments.findIndex(p => p.paymentMethodId === paymentMethod.id);
		if (existingIndex >= 0) {
			return; // Don't add duplicate payment methods
		}
		
		// Add with remaining balance or minimum amount
		const amount = paymentBalance > 0 ? paymentBalance : 0;
		
		orderPayments = [...orderPayments, {
			paymentMethodId: paymentMethod.id,
			paymentMethod: paymentMethod,
			amount: amount,
			notes: ''
		}];
		
		selectedPaymentMethodId = '';
		showPaymentDropdown = false;
	}
	
	function removePayment(index: number) {
		orderPayments = orderPayments.filter((_, i) => i !== index);
	}
	
	function updatePaymentAmount(index: number, amount: number) {
		const validAmount = isNaN(amount) ? 0 : Math.max(0, amount);
		orderPayments[index].amount = validAmount;
	}
	
	function updatePaymentNotes(index: number, notes: string) {
		orderPayments[index].notes = notes;
	}
	
	function validateForm() {
		errors = {};
		
		// Atendente é sempre obrigatório
		if (!selectedAttendantId) {
			errors.attendant = 'Atendente é obrigatório';
		}
		
		// Cliente é obrigatório quando há pelo menos um item do tipo aluguel
		if (hasRentalItems && !selectedCustomerId) {
			errors.customer = 'Cliente é obrigatório quando há itens de aluguel';
		}
		
		if (!orderDate) {
			errors.orderDate = 'Data do pedido é obrigatória';
		}
		
		if (hasRentalItems) {
			if (!rentalStartDate) {
				errors.rentalStartDate = 'Data de início é obrigatória para aluguéis';
			}
			if (!rentalEndDate) {
				errors.rentalEndDate = 'Data de fim é obrigatória para aluguéis';
			}
			if (rentalStartDate && rentalEndDate && new Date(rentalStartDate) >= new Date(rentalEndDate)) {
				errors.rentalEndDate = 'Data de fim deve ser posterior à data de início';
			}
		}
		
		if (orderItems.length === 0) {
			errors.items = 'Pelo menos um produto é obrigatório';
		}
		
		// Validate stock availability
		for (const item of orderItems) {
			if (item.product && item.quantity > item.product.stockQuantity) {
				// Check if negative stock is allowed
				const allowNegativeStock = settings?.allowNegativeStock || false;
				
				if (!allowNegativeStock) {
					// Show toast notification for blocked stock
					notificationStore.error(
						`Estoque insuficiente para ${item.product.name}. Estoque atual: ${item.product.stockQuantity}. Para permitir estoque negativo, habilite a opção em Configurações.`,
						8000
					);
					errors.items = `Estoque insuficiente para ${item.product.name}`;
					break;
				} else {
					// Allow negative stock but show warning
					if (item.product.stockQuantity <= 0) {
						notificationStore.warning(
							`Atenção: ${item.product.name} possui estoque ${item.product.stockQuantity}. Venda/aluguel permitida por configuração.`,
							6000
						);
					}
				}
			}
			
			// Validate item type availability
			if (item.product) {
				if (item.itemType === 'RENTAL' && !item.product.availableForRental) {
					errors.items = `${item.product.name} não está disponível para aluguel`;
					break;
				}
				if (item.itemType === 'SALE' && !item.product.availableForSale) {
					errors.items = `${item.product.name} não está disponível para venda`;
					break;
				}
			}
		}
		
		// Validate payments
		if (orderPayments.length === 0) {
			errors.payments = 'Pelo menos um meio de pagamento é obrigatório';
		} else if (Math.abs(paymentBalance) > 0.01) { // Allow small rounding differences
			if (paymentBalance > 0) {
				errors.payments = `Valor restante a pagar: R$ ${paymentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
			} else {
				errors.payments = `Valor excedente: R$ ${Math.abs(paymentBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
			}
		}
		
		// Validate individual payment amounts
		for (const payment of orderPayments) {
			if (payment.amount <= 0) {
				errors.payments = 'Todos os valores de pagamento devem ser maiores que zero';
				break;
			}
		}
		
		return Object.keys(errors).length === 0;
	}
	
	function handleSubmit() {
		if (!validateForm()) return;
		
		loading = true;
		
		const orderData = {
			...(selectedCustomerId && { customerId: parseInt(selectedCustomerId) }),
			attendantId: parseInt(selectedAttendantId),
			orderDate: new Date(orderDate),
			rentalStartDate: rentalStartDate ? new Date(rentalStartDate) : undefined,
			rentalEndDate: rentalEndDate ? new Date(rentalEndDate) : undefined,
			notes,
			// Order-level discount and surcharge
			subtotalAmount: parseFloat(subtotalAmount.toString()),
			discountType: orderDiscountType || undefined,
			discountValue: orderDiscountType && orderDiscountValue > 0 ? parseFloat(orderDiscountValue.toString()) : undefined,
			surchargeType: orderSurchargeType || undefined,
			surchargeValue: orderSurchargeType && orderSurchargeValue > 0 ? parseFloat(orderSurchargeValue.toString()) : undefined,
			totalAmount: parseFloat(totalAmount.toString()),
			items: orderItems.map(item => ({
				productId: parseInt(item.productId.toString()),
				quantity: parseInt(item.quantity.toString()),
				unitPrice: parseFloat(item.unitPrice.toString()),
				itemType: item.itemType,
				// Item-level discount
				discountType: item.discountType || undefined,
				discountValue: item.discountType && item.discountValue && item.discountValue > 0 ? parseFloat(item.discountValue.toString()) : undefined,
				// Item-level surcharge
				surchargeType: item.surchargeType || undefined,
				surchargeValue: item.surchargeType && item.surchargeValue && item.surchargeValue > 0 ? parseFloat(item.surchargeValue.toString()) : undefined
			})),
			payments: orderPayments.map(payment => ({
				paymentMethodId: parseInt(payment.paymentMethodId.toString()),
				amount: parseFloat(payment.amount.toString()),
				notes: payment.notes || ''
			}))
		};
		
		dispatch('submit', { order: orderData });
		loading = false;
	}
	
	function handleCancel() {
		dispatch('cancel');
	}
</script>

<!-- Modal Backdrop -->
<div 
	class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" 
	on:click={handleCancel}
	on:keydown={(e) => {
		if (e.key === 'Escape') {
			handleCancel();
		}
	}}
	tabindex="0"
	role="dialog"
	aria-modal="true"
	aria-labelledby="modal-title"
>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<div 
		class="relative top-2 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-5/6 xl:w-4/5 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto" 
		on:click={(e) => {
			// Handle clicks inside modal - close dropdowns if clicking outside them
			const target = e.target as Element;
			const isInsideProductDropdown = productDropdownRef && productDropdownRef.contains(target);
			const isInsideCustomerDropdown = customerDropdownRef && customerDropdownRef.contains(target);
			
			if (showProductDropdown && !isInsideProductDropdown) {
				showProductDropdown = false;
				productSelectedIndex = -1;
			}
			
			if (showCustomerDropdown && !isInsideCustomerDropdown) {
				showCustomerDropdown = false;
				customerSelectedIndex = -1;
			}
			
			// Stop propagation to prevent modal from closing
			e.stopPropagation();
		}}
		on:keydown|stopPropagation
		tabindex="-1"
		role="document"
	>
		<!-- Modal Header -->
		<div class="flex items-center justify-between pb-4 border-b">
			<h3 id="modal-title" class="text-lg font-medium text-gray-900">Novo Pedido</h3>
			<!-- svelte-ignore a11y_consider_explicit_label -->
			<button
				on:click={handleCancel}
				class="text-gray-400 hover:text-gray-600 transition-colors"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
		
		<!-- Tabs Navigation -->
		<div class="border-b border-gray-200 mt-4">
			<nav class="-mb-px flex space-x-8">
				<button
					type="button"
					on:click={() => activeTab = 'items'}
					class="{activeTab === 'items' 
						? 'border-primary-500 text-primary-600' 
						: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
					} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
				>
					<svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 21h6" />
					</svg>
					Itens ({orderItems.length})
				</button>
				<button
					type="button"
					on:click={() => activeTab = 'order'}
					class="{activeTab === 'order' 
						? 'border-primary-500 text-primary-600' 
						: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
					} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
				>
					<svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					Informações do Pedido
				</button>
			</nav>
		</div>
		
		<!-- Modal Body -->
		<form on:submit|preventDefault={handleSubmit} class="mt-4">
			{#if activeTab === 'items'}
				<!-- Items Tab -->
				<div class="space-y-6">
					<!-- Product Search -->
					<div class="bg-gray-50 p-4 rounded-lg">
						<h4 class="text-md font-medium text-gray-900 mb-4">Adicionar Produtos</h4>
						<div class="relative" bind:this={productDropdownRef}>
							<input
								type="text"
								bind:value={productSearch}
								on:input={searchProducts}
								on:focus={() => {
									showProductDropdown = true;
									productSelectedIndex = -1;
								}}
								on:keydown={(e) => {
									if (e.key === 'Escape') {
										showProductDropdown = false;
										productSelectedIndex = -1;
										e.stopPropagation();
									} else if (e.key === 'ArrowDown' && showProductDropdown) {
										e.preventDefault();
										productSelectedIndex = Math.min(productSelectedIndex + 1, productsList.length - 1);
									} else if (e.key === 'ArrowUp' && showProductDropdown) {
										e.preventDefault();
										productSelectedIndex = Math.max(productSelectedIndex - 1, -1);
									} else if (e.key === 'Enter' && showProductDropdown && productSelectedIndex >= 0) {
										e.preventDefault();
										addProduct(productsList[productSelectedIndex]);
									}
								}}
								class="form-input w-full"
								placeholder="Buscar produto por nome ou SKU..."
							/>
							{#if showProductDropdown && productsList.length > 0}
								<div class="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
									{#each productsList as product, index}
										<button
											type="button"
											on:click={() => addProduct(product)}
											class="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 {productSelectedIndex === index ? 'bg-blue-50 border-l-4 border-blue-500' : ''} {product.stockQuantity <= 0 && !(settings?.allowNegativeStock) ? 'opacity-50 cursor-not-allowed' : ''}"
										>
											<div class="flex justify-between">
												<div>
													<div class="font-medium">{product.name}</div>
													<div class="text-sm text-gray-500">{product.sku} - Estoque: {product.stockQuantity}</div>
												</div>
												<div class="text-sm">
													<div>A: R$ {product.rentalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
													<div>V: R$ {product.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
												</div>
											</div>
										</button>
									{/each}
								</div>
							{/if}
						</div>
					</div>
					
					<!-- Order Items with Enhanced Cards -->
					{#if orderItems.length > 0}
						<div class="space-y-4">
							<h5 class="text-lg font-medium text-gray-900">Itens do Pedido</h5>
							{#each orderItems as item, index}
								<div class="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
									<!-- Item Header -->
									<div class="flex justify-between items-start mb-4">
										<div class="flex-1">
											<h6 class="font-semibold text-lg text-gray-900">{item.product?.name}</h6>
											<div class="text-sm text-gray-500 mt-1">
												<span class="bg-gray-100 px-2 py-1 rounded">{item.product?.sku}</span>
												<span class="ml-2">Estoque: {item.product?.stockQuantity}</span>
											</div>
										</div>
										<!-- svelte-ignore a11y_consider_explicit_label -->
										<button
											type="button"
											on:click={() => removeItem(index)}
											class="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition-colors"
											title="Remover item"
										>
											<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
										</button>
									</div>
								
									<!-- Item Fields Grid -->
									<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 mb-4">
										<div>
											<!-- svelte-ignore a11y_label_has_associated_control -->
											<label class="block text-sm font-medium text-gray-700 mb-1">Quantidade *</label>
											<input
												type="number"
												min="1"
												max={!(settings?.allowNegativeStock) ? item.product?.stockQuantity : undefined}
												value={item.quantity}
												on:change={(e) => {
													const target = e.target as HTMLInputElement;
													if (target) {
														updateItemQuantity(index, parseInt(target.value));
													}
												}}
												class="form-input"
											/>
										</div>
										<div>
											<!-- svelte-ignore a11y_label_has_associated_control -->
											<label class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
											<select
												value={item.itemType}
												on:change={(e) => {
													const target = e.target as HTMLSelectElement;
													if (target) {
														updateItemType(index, target.value as 'RENTAL' | 'SALE');
													}
												}}
												class="form-input"
												disabled={!canChangeItemType(item.product)}
											>
												<option value="RENTAL">Aluguel</option>
												<option value="SALE">Venda</option>
											</select>
											{#if !canChangeItemType(item.product)}
												<p class="text-xs text-gray-500 mt-1">
													{item.product?.availableForRental && !item.product?.availableForSale ? 'Apenas aluguel' : 
													 !item.product?.availableForRental && item.product?.availableForSale ? 'Apenas venda' : 'Indisponível'}
												</p>
											{/if}
										</div>
										<div>
											<!-- svelte-ignore a11y_label_has_associated_control -->
											<label class="block text-sm font-medium text-gray-700 mb-1">Preço Unitário *</label>
											<input
												type="number"
												min="0"
												step="0.01"
												value={item.unitPrice}
												on:change={(e) => {
													const target = e.target as HTMLInputElement;
													if (target) {
														const value = parseFloat(target.value);
														updateItemPrice(index, isNaN(value) ? 0 : value);
													}
												}}
												class="form-input"
												placeholder="0,00"
												disabled={true}
											/>
										</div>
										<div>
											<!-- svelte-ignore a11y_label_has_associated_control -->
											<label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Desconto</label>
											<select
												value={item.discountType || ''}
												on:change={(e) => {
													const target = e.target as HTMLSelectElement;
													if (target) {
														updateItemDiscountType(index, target.value);
													}
												}}
												class="form-input"
											>
												<option value="">Sem desconto</option>
												<option value="PERCENTAGE">Percentual (%)</option>
												<option value="FIXED">Valor Fixo (R$)</option>
											</select>
										</div>
										<div>
											<!-- svelte-ignore a11y_label_has_associated_control -->
											<label class="block text-sm font-medium text-gray-700 mb-1">
												{item.discountType === 'PERCENTAGE' ? 'Desconto (%)' : 'Desconto (R$)'}
											</label>
											<input
												type="number"
												min="0"
												max={item.discountType === 'PERCENTAGE' ? 100 : undefined}
												step={item.discountType === 'PERCENTAGE' ? '1' : '0.01'}
												value={item.discountValue || 0}
												on:change={(e) => {
													const target = e.target as HTMLInputElement;
													if (target) {
														const value = parseFloat(target.value);
														updateItemDiscountValue(index, isNaN(value) ? 0 : value);
													}
												}}
												class="form-input"
												placeholder="0"
												disabled={!item.discountType}
											/>
										</div>
										{#if surchargeEnabled}
											<div>
												<!-- svelte-ignore a11y_label_has_associated_control -->
												<label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Acréscimo</label>
												<select
													value={item.surchargeType || ''}
													on:change={(e) => {
														const target = e.target as HTMLSelectElement;
														if (target) {
															updateItemSurchargeType(index, target.value);
														}
													}}
													class="form-input"
												>
													<option value="">Sem acréscimo</option>
													<option value="PERCENTAGE">Percentual (%)</option>
													<option value="FIXED">Valor Fixo (R$)</option>
												</select>
											</div>
											<div>
												<!-- svelte-ignore a11y_label_has_associated_control -->
												<label class="block text-sm font-medium text-gray-700 mb-1">
													{item.surchargeType === 'PERCENTAGE' ? 'Acréscimo (%)' : 'Acréscimo (R$)'}
												</label>
												<input
													type="number"
													min="0"
													max={item.surchargeType === 'PERCENTAGE' ? 100 : undefined}
													step={item.surchargeType === 'PERCENTAGE' ? '1' : '0.01'}
													value={item.surchargeValue || 0}
													on:change={(e) => {
														const target = e.target as HTMLInputElement;
														if (target) {
															const value = parseFloat(target.value);
															updateItemSurchargeValue(index, isNaN(value) ? 0 : value);
														}
													}}
													class="form-input"
													placeholder="0"
													disabled={!item.surchargeType}
												/>
											</div>
										{/if}
									</div>
								
									<!-- Item Totals -->
									<div class="flex justify-between items-center pt-4 border-t border-gray-200">
										<div class="flex space-x-6 text-sm">
											<span class="text-gray-600">Subtotal: <span class="font-medium">R$ {(item.quantity * item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
											{#if item.discountType && item.discountValue && item.discountValue > 0}
												<span class="text-red-600">Desconto: <span class="font-medium">-R$ {calculateDiscount(item.quantity * item.unitPrice, item.discountType, item.discountValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
											{/if}
											{#if surchargeEnabled && item.surchargeType && item.surchargeValue && item.surchargeValue > 0}
												<span class="text-green-600">Acréscimo: <span class="font-medium">+R$ {(() => {
													let amount = item.quantity * item.unitPrice;
													if (item.discountType && item.discountValue && item.discountValue > 0) {
														amount = applyDiscount(amount, item.discountType, item.discountValue);
													}
													return calculateSurcharge(amount, item.surchargeType, item.surchargeValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
												})()}</span></span>
											{/if}
										</div>
										<div class="text-lg font-semibold text-gray-900">
											Total: R$ {
												(() => {
													let itemTotal = item.quantity * item.unitPrice;
													if (item.discountType && item.discountValue && item.discountValue > 0) {
														itemTotal = applyDiscount(itemTotal, item.discountType, item.discountValue);
													}
													if (surchargeEnabled && item.surchargeType && item.surchargeValue && item.surchargeValue > 0) {
														itemTotal = applySurcharge(itemTotal, item.surchargeType, item.surchargeValue);
													}
													return itemTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
												})()
											}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="text-center py-12 bg-gray-50 rounded-lg">
							<svg class="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 48 48">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 21h6" />
							</svg>
							<h3 class="text-lg font-medium text-gray-900 mb-2">Nenhum item adicionado</h3>
							<p class="text-gray-500">Use a busca acima para adicionar produtos ao pedido</p>
						</div>
					{/if}
					
					{#if errors.items}
						<p class="text-sm text-red-600 bg-red-50 p-3 rounded-md">{errors.items}</p>
					{/if}
					
					<!-- Order Level Discount Section -->
					{#if orderItems.length > 0}
						<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
							<h5 class="text-md font-medium text-yellow-800 mb-3">Desconto no Pedido</h5>
							<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<!-- svelte-ignore a11y_label_has_associated_control -->
									<label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Desconto</label>
									<select
										bind:value={orderDiscountType}
										class="form-input"
									>
										<option value="">Sem desconto</option>
										<option value="PERCENTAGE">Percentual (%)</option>
										<option value="FIXED">Valor Fixo (R$)</option>
									</select>
								</div>
								<div>
									<!-- svelte-ignore a11y_label_has_associated_control -->
									<label class="block text-sm font-medium text-gray-700 mb-1">
										{orderDiscountType === 'PERCENTAGE' ? 'Desconto (%)' : 'Desconto (R$)'}
									</label>
									<input
										type="number"
										min="0"
										max={orderDiscountType === 'PERCENTAGE' ? 100 : undefined}
										step={orderDiscountType === 'PERCENTAGE' ? '1' : '0.01'}
										bind:value={orderDiscountValue}
										class="form-input"
										placeholder="0"
										disabled={!orderDiscountType}
									/>
								</div>
								<div class="flex items-end">
									<button
										type="button"
										on:click={applyOrderDiscountToItems}
										class="btn btn-secondary btn-sm"
										disabled={!orderDiscountType || orderDiscountValue <= 0}
									>
										Distribuir aos Itens
									</button>
								</div>
							</div>
							<div class="text-sm text-gray-600 mt-2">
								O desconto será aplicado proporcionalmente a todos os itens
							</div>
						</div>
					{/if}
					
					<!-- Order Level Surcharge Section -->
					{#if orderItems.length > 0 && surchargeEnabled}
						<div class="bg-green-50 border border-green-200 rounded-lg p-4">
							<h5 class="text-md font-medium text-green-800 mb-3">Acréscimo no Pedido</h5>
							<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<!-- svelte-ignore a11y_label_has_associated_control -->
									<label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Acréscimo</label>
									<select
										bind:value={orderSurchargeType}
										class="form-input"
									>
										<option value="">Sem acréscimo</option>
										<option value="PERCENTAGE">Percentual (%)</option>
										<option value="FIXED">Valor Fixo (R$)</option>
									</select>
								</div>
								<div>
									<!-- svelte-ignore a11y_label_has_associated_control -->
									<label class="block text-sm font-medium text-gray-700 mb-1">
										{orderSurchargeType === 'PERCENTAGE' ? 'Acréscimo (%)' : 'Acréscimo (R$)'}
									</label>
									<input
										type="number"
										min="0"
										max={orderSurchargeType === 'PERCENTAGE' ? 100 : undefined}
										step={orderSurchargeType === 'PERCENTAGE' ? '1' : '0.01'}
										bind:value={orderSurchargeValue}
										class="form-input"
										placeholder="0"
										disabled={!orderSurchargeType}
									/>
								</div>
								<div class="flex items-end">
									<button
										type="button"
										on:click={applyOrderSurchargeToItems}
										class="btn btn-secondary btn-sm"
										disabled={!orderSurchargeType || orderSurchargeValue <= 0}
									>
										Distribuir aos Itens
									</button>
								</div>
							</div>
							<div class="text-sm text-gray-600 mt-2">
								O acréscimo será aplicado proporcionalmente a todos os itens
							</div>
						</div>
					{/if}
					
					<!-- Order Summary -->
					<div class="bg-gray-50 border rounded-lg p-4 mt-6">
						<h5 class="font-medium text-gray-900 mb-3">Resumo do Pedido</h5>
						<div class="space-y-2 text-sm">
							<div class="flex justify-between">
								<span>Subtotal:</span>
								<span class="font-medium">R$ {subtotalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
							</div>
							{#if orderDiscountType && orderDiscountValue > 0}
								<div class="flex justify-between text-red-600">
									<span>Desconto no pedido:</span>
									<span class="font-medium">-R$ {(() => {
										let amount = subtotalAmount;
										return calculateDiscount(amount, orderDiscountType, orderDiscountValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
									})()}</span>
								</div>
							{/if}
							{#if surchargeEnabled && orderSurchargeType && orderSurchargeValue > 0}
								<div class="flex justify-between text-green-600">
									<span>Acréscimo no pedido:</span>
									<span class="font-medium">+R$ {(() => {
										let amount = subtotalAmount;
										if (orderDiscountType && orderDiscountValue > 0) {
											amount = applyDiscount(amount, orderDiscountType, orderDiscountValue);
										}
										return calculateSurcharge(amount, orderSurchargeType, orderSurchargeValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
									})()}</span>
								</div>
							{/if}
							<div class="flex justify-between text-lg font-semibold border-t pt-2">
								<span>Total:</span>
								<span>R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
							</div>
						</div>
					</div>
				</div>

			{:else if activeTab === 'order'}
				<!-- Order Information Tab -->
				<div class="space-y-6">
					<!-- Customer Search -->
					<div class="relative" bind:this={customerDropdownRef}>
						<label for="customer" class="form-label">Cliente {hasRentalItems ? '*' : ''}</label>
						<input
							type="text"
							bind:value={customerSearch}
							on:input={searchCustomers}
							on:focus={() => {
								showCustomerDropdown = true;
								customerSelectedIndex = -1;
							}}
							on:keydown={(e) => {
								if (e.key === 'Escape') {
									showCustomerDropdown = false;
									customerSelectedIndex = -1;
									e.stopPropagation();
								} else if (e.key === 'ArrowDown' && showCustomerDropdown) {
									e.preventDefault();
									customerSelectedIndex = Math.min(customerSelectedIndex + 1, customersList.length - 1);
								} else if (e.key === 'ArrowUp' && showCustomerDropdown) {
									e.preventDefault();
									customerSelectedIndex = Math.max(customerSelectedIndex - 1, -1);
								} else if (e.key === 'Enter' && showCustomerDropdown && customerSelectedIndex >= 0) {
									e.preventDefault();
									selectCustomer(customersList[customerSelectedIndex]);
								}
							}}
							class="form-input {errors.customer ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
							placeholder="Buscar cliente por nome ou email..."
							required={hasRentalItems}
						/>
						{#if showCustomerDropdown && customersList.length > 0}
							<div class="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
								{#each customersList as customer, index}
									<button
										type="button"
										on:click={() => selectCustomer(customer)}
										class="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 {customerSelectedIndex === index ? 'bg-blue-50 border-l-4 border-blue-500' : ''}"
									>
										<div class="font-medium">{customer.name}</div>
										<div class="text-sm text-gray-500">{customer.email}</div>
									</button>
								{/each}
							</div>
						{/if}
						{#if errors.customer}
							<p class="mt-1 text-sm text-red-600">{errors.customer}</p>
						{/if}
					</div>
								
					<!-- Attendant Selection -->
					<div>
						<label for="attendant" class="form-label">Atendente *</label>
						<select
							id="attendant"
							bind:value={selectedAttendantId}
							class="form-input {errors.attendant ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
							required
						>
							<option value="">Selecione um atendente</option>
							{#each employeesList as employee}
								{#if employee.active}
									<option value={employee.id}>{employee.name} ({employee.abbreviation})</option>
								{/if}
							{/each}
						</select>
						{#if errors.attendant}
							<p class="mt-1 text-sm text-red-600">{errors.attendant}</p>
						{/if}
					</div>
					
					<!-- Order Date -->
					<div>
						<label for="orderDate" class="form-label">Data do pedido *</label>
						<input
							id="orderDate"
							type="date"
							bind:value={orderDate}
							class="form-input {errors.orderDate ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
							required
						/>
						{#if errors.orderDate}
							<p class="mt-1 text-sm text-red-600">{errors.orderDate}</p>
						{/if}
					</div>
					
					{#if hasRentalItems}
						<!-- Rental Dates -->
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label for="rentalStartDate" class="form-label">Data de início *</label>
								<input
									id="rentalStartDate"
									type="date"
									bind:value={rentalStartDate}
									class="form-input {errors.rentalStartDate ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
									required
								/>
								{#if errors.rentalStartDate}
									<p class="mt-1 text-sm text-red-600">{errors.rentalStartDate}</p>
								{/if}
							</div>
							<div>
								<label for="rentalEndDate" class="form-label">Data de fim *</label>
								<input
									id="rentalEndDate"
									type="date"
									bind:value={rentalEndDate}
									class="form-input {errors.rentalEndDate ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
									required
								/>
								{#if errors.rentalEndDate}
									<p class="mt-1 text-sm text-red-600">{errors.rentalEndDate}</p>
								{/if}
							</div>
						</div>
						
						{#if rentalDays > 0}
							<div class="text-sm text-gray-600">
								Duração: {rentalDays} dia(s)
							</div>
						{/if}
					{/if}
					
					<!-- Notes -->
					<div>
						<label for="notes" class="form-label">Observações</label>
						<textarea
							id="notes"
							bind:value={notes}
							rows="3"
							class="form-input"
							placeholder="Observações sobre o pedido..."
						></textarea>
					</div>

					<!-- Status Information -->
					<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
						<div class="flex items-start space-x-3">
							<svg class="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<div>
								<h4 class="text-sm font-medium text-blue-800 mb-1">Status inicial do pedido</h4>
								<div class="text-sm text-blue-700">
									{#if orderItems.length > 0}
										{#if orderItems.every(item => item.itemType === 'SALE')}
											<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
												<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
													<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
												</svg>
												Confirmado
											</span>
											Este pedido será <strong>confirmado automaticamente</strong> pois contém apenas itens de venda.
										{:else}
											<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mr-2">
												<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
													<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
												</svg>
												Pendente
											</span>
											Este pedido ficará <strong>pendente</strong> pois contém itens de aluguel que necessitam aprovação.
										{/if}
									{:else}
										<span class="text-gray-600">Adicione itens para ver o status inicial</span>
									{/if}
								</div>
							</div>
						</div>
					</div>

					<!-- Payment Methods Section -->
					<div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
						<h4 class="text-lg font-medium text-blue-800 mb-4">Meios de Pagamento</h4>
						
						<!-- Payment Method Selection -->
						<div class="mb-4">
							<!-- svelte-ignore a11y_label_has_associated_control -->
							<label class="form-label">Adicionar meio de pagamento</label>
							<select
								bind:value={selectedPaymentMethodId}
								on:change={addPayment}
								class="form-input"
							>
								<option value="">Selecione um meio de pagamento</option>
								{#each paymentMethods as paymentMethod}
									{#if !orderPayments.find(p => p.paymentMethodId === paymentMethod.id)}
										<option value={paymentMethod.id}>{paymentMethod.name}</option>
									{/if}
								{/each}
							</select>
						</div>
						
						<!-- Payment Items -->
						{#if orderPayments.length > 0}
							<div class="space-y-3">
								<h5 class="text-sm font-medium text-gray-700">Pagamentos do pedido</h5>
								{#each orderPayments as payment, index}
									<div class="border rounded-lg p-4 bg-white">
										<div class="flex justify-between items-start mb-3">
											<div class="flex-1">
												<div class="font-medium text-sm">{payment.paymentMethod?.name}</div>
												<div class="text-xs text-gray-500">{payment.paymentMethod?.description || ''}</div>
											</div>
											<!-- svelte-ignore a11y_consider_explicit_label -->
											<button
												type="button"
												on:click={() => removePayment(index)}
												class="text-red-600 hover:text-red-800 p-1 rounded"
												title="Remover pagamento"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
												</svg>
											</button>
										</div>
										<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
											<div>
												<!-- svelte-ignore a11y_label_has_associated_control -->
												<label class="block text-xs font-medium text-gray-700 mb-1">Valor *</label>
												<input
													type="number"
													min="0"
													step="0.01"
													max={totalAmount}
													value={payment.amount}
													on:change={(e) => {
														const target = e.target as HTMLInputElement;
														if (target) {
															const value = parseFloat(target.value);
															updatePaymentAmount(index, isNaN(value) ? 0 : value);
														}
													}}
													class="form-input"
													placeholder="0,00"
												/>
											</div>
											<div>
												<!-- svelte-ignore a11y_label_has_associated_control -->
												<label class="block text-xs font-medium text-gray-700 mb-1">Observações</label>
												<input
													type="text"
													value={payment.notes || ''}
													on:change={(e) => {
														const target = e.target as HTMLInputElement;
														if (target) {
															updatePaymentNotes(index, target.value);
														}
													}}
													class="form-input"
													placeholder="Opcional"
												/>
											</div>
										</div>
									</div>
								{/each}
								
								<!-- Payment Summary -->
								<div class="border-t pt-4 bg-gray-50 rounded-lg p-4">
									<div class="space-y-2 text-sm">
										<div class="flex justify-between">
											<span>Total do pedido:</span>
											<span class="font-medium">R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
										</div>
										<div class="flex justify-between">
											<span>Total pago:</span>
											<span class="font-medium">R$ {totalPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
										</div>
										<div class="flex justify-between text-sm font-semibold border-t pt-2">
											<span>Saldo:</span>
											<span class="{paymentBalance > 0.01 ? 'text-red-600' : paymentBalance < -0.01 ? 'text-orange-600' : 'text-green-600'}">
												R$ {paymentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
											</span>
										</div>
										{#if Math.abs(paymentBalance) > 0.01}
											<div class="text-xs text-gray-500 mt-1">
												{#if paymentBalance > 0}
													Faltam R$ {paymentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para quitar
												{:else}
													Valor excedente de R$ {Math.abs(paymentBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
												{/if}
											</div>
										{/if}
									</div>
								</div>
							</div>
						{:else}
							<div class="text-center py-8 text-gray-500">
								<svg class="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 48 48">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z" />
								</svg>
								<p class="font-medium">Nenhum meio de pagamento adicionado</p>
								<p class="text-sm">Selecione os meios de pagamento acima</p>
							</div>
						{/if}
						
						{#if errors.payments}
							<p class="text-sm text-red-600 bg-red-50 p-3 rounded-md mt-3">{errors.payments}</p>
						{/if}
					</div>
				</div>
			{/if}
			
			<!-- Modal Footer -->
			<div class="flex items-center justify-end space-x-3 pt-6 border-t mt-6">
				<button
					type="button"
					on:click={handleCancel}
					class="btn btn-secondary"
					disabled={loading}
				>
					Cancelar
				</button>
				<button
					type="submit"
					class="btn btn-primary"
					disabled={loading || orderItems.length === 0}
				>
					{#if loading}
						<svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Criando...
					{:else}
						Criar Pedido
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>