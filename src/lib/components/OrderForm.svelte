<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { customers } from '$lib/stores/customers.js';
	import { products } from '$lib/stores/products.js';
	import { employees } from '$lib/stores/employees.js';
	
	const dispatch = createEventDispatcher();
	
	let selectedCustomerId = '';
	let selectedAttendantId = '';
	let orderType: 'RENTAL' | 'SALE' = 'RENTAL';
	let orderDate = new Date().toISOString().split('T')[0];
	let rentalStartDate = '';
	let rentalEndDate = '';
	let notes = '';
	let orderItems: Array<{
		productId: number;
		product?: any;
		quantity: number;
		unitPrice: number;
		itemType: 'RENTAL' | 'SALE';
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
	
	// Reactive declarations
	let customersData: any;
	let employeesData: any;
	let productsData: any;
	let totalAmount: number;
	let totalPayments: number;
	let paymentBalance: number;
	let isRental: boolean;
	let rentalDays: number;
	
	$: {
		customersData = $customers;
		employeesData = $employees;
		productsData = $products;
		totalAmount = orderItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
		totalPayments = orderPayments.reduce((sum, payment) => sum + payment.amount, 0);
		paymentBalance = totalAmount - totalPayments;
		isRental = orderType === 'RENTAL';
		rentalDays = rentalStartDate && rentalEndDate 
			? Math.ceil((new Date(rentalEndDate).getTime() - new Date(rentalStartDate).getTime()) / (1000 * 60 * 60 * 24))
			: 0;
	}
	
	onMount(() => {
		loadInitialData();
	});
	
	async function loadInitialData() {
		await Promise.all([
			customers.fetch({ limit: 50 }),
			employees.fetch({ limit: 50 }),
			products.fetchProducts({ limit: 50 }),
			products.fetchGroups(),
			loadPaymentMethods()
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
	
	async function searchCustomers() {
		if (customerSearch.length < 2) return;
		
		searchingCustomers = true;
		await customers.fetch({ search: customerSearch, limit: 20 });
		customersList = customersData.customers;
		searchingCustomers = false;
		showCustomerDropdown = true;
	}
	
	async function searchProducts() {
		if (productSearch.length < 2) return;
		
		searchingProducts = true;
		await products.fetchProducts({ search: productSearch, limit: 20 });
		productsList = productsData.products;
		searchingProducts = false;
		showProductDropdown = true;
	}
	
	function selectCustomer(customer: any) {
		selectedCustomerId = customer.id.toString();
		customerSearch = customer.name;
		showCustomerDropdown = false;
	}
	
	function addProduct(product: any) {
		const existingIndex = orderItems.findIndex(item => item.productId === product.id);
		
		if (existingIndex >= 0) {
			orderItems[existingIndex].quantity += 1;
		} else {
			const defaultPrice = isRental ? product.rentalPrice : product.salePrice;
			orderItems = [...orderItems, {
				productId: product.id,
				product: product,
				quantity: 1,
				unitPrice: defaultPrice,
				itemType: orderType
			}];
		}
		
		productSearch = '';
		showProductDropdown = false;
	}
	
	function removeItem(index: number) {
		orderItems = orderItems.filter((_, i) => i !== index);
	}
	
	function updateItemQuantity(index: number, quantity: number) {
		if (quantity <= 0) {
			removeItem(index);
		} else {
			orderItems[index].quantity = quantity;
		}
	}
	
	function updateItemPrice(index: number, price: number) {
		// Ensure price is a valid number
		const validPrice = isNaN(price) ? 0 : price;
		orderItems[index].unitPrice = validPrice;
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
		
		// Cliente é obrigatório apenas para aluguéis
		if (isRental && !selectedCustomerId) {
			errors.customer = 'Cliente é obrigatório para aluguéis';
		}
		
		if (!orderDate) {
			errors.orderDate = 'Data do pedido é obrigatória';
		}
		
		if (isRental) {
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
				errors.items = `Estoque insuficiente para ${item.product.name}`;
				break;
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
			orderType,
			orderDate: new Date(orderDate),
			rentalStartDate: rentalStartDate ? new Date(rentalStartDate) : undefined,
			rentalEndDate: rentalEndDate ? new Date(rentalEndDate) : undefined,
			notes,
			items: orderItems.map(item => ({
				productId: parseInt(item.productId.toString()),
				quantity: parseInt(item.quantity.toString()),
				unitPrice: parseFloat(item.unitPrice.toString()),
				itemType: item.itemType
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
		class="relative top-4 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto" 
		on:click|stopPropagation
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
		
		<!-- Modal Body -->
		<form on:submit|preventDefault={handleSubmit} class="mt-4">
			<div class="grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-2 gap-6">
				<!-- Left Column - Order Info -->
				<div class="space-y-4">
					<h4 class="text-md font-medium text-gray-900">Informações do Pedido</h4>
					
					<!-- Order Type -->
					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="form-label">Tipo de pedido *</label>
						<div class="flex space-x-4">
							<label class="flex items-center">
								<input
									type="radio"
									bind:group={orderType}
									value="RENTAL"
									class="mr-2 text-primary-600 focus:ring-primary-500"
								/>
								Aluguel
							</label>
							<label class="flex items-center">
								<input
									type="radio"
									bind:group={orderType}
									value="SALE"
									class="mr-2 text-primary-600 focus:ring-primary-500"
								/>
								Venda
							</label>
						</div>
					</div>
					
					<!-- Customer Search -->
					<div class="relative">
						<label for="customer" class="form-label">Cliente {isRental ? '*' : ''}</label>
						<input
							type="text"
							bind:value={customerSearch}
							on:input={searchCustomers}
							on:focus={() => showCustomerDropdown = true}
							class="form-input {errors.customer ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
							placeholder="Buscar cliente por nome ou email..."
							required={isRental}
						/>
						{#if showCustomerDropdown && customersList.length > 0}
							<div class="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
								{#each customersList as customer}
									<button
										type="button"
										on:click={() => selectCustomer(customer)}
										class="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100"
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
					
					{#if isRental}
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
				</div>
				
				<!-- Right Column - Products -->
				<div class="space-y-4">
					<h4 class="text-md font-medium text-gray-900">Produtos</h4>
					
					<!-- Product Search -->
					<div class="relative">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="form-label">Adicionar produto</label>
						<input
							type="text"
							bind:value={productSearch}
							on:input={searchProducts}
							on:focus={() => showProductDropdown = true}
							class="form-input"
							placeholder="Buscar produto por nome ou SKU..."
						/>
						{#if showProductDropdown && productsList.length > 0}
							<div class="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
								{#each productsList as product}
									<button
										type="button"
										on:click={() => addProduct(product)}
										class="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100"
										disabled={product.stockQuantity === 0}
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
					
					<!-- Order Items -->
					{#if orderItems.length > 0}
						<div class="space-y-3">
							<h5 class="text-sm font-medium text-gray-700">Itens do pedido</h5>
							{#each orderItems as item, index}
								<div class="border rounded-lg p-3 bg-gray-50">
									<div class="flex justify-between items-start mb-2">
										<div class="flex-1">
											<div class="font-medium text-sm">{item.product?.name}</div>
											<div class="text-xs text-gray-500">{item.product?.sku}</div>
										</div>
										<!-- svelte-ignore a11y_consider_explicit_label -->
										<button
											type="button"
											on:click={() => removeItem(index)}
											class="text-red-600 hover:text-red-800"
											title="Remover item"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
									<div class="grid grid-cols-3 gap-2">
										<div>
											<!-- svelte-ignore a11y_label_has_associated_control -->
											<label class="text-xs text-gray-600">Qtd</label>
											<input
												type="number"
												min="1"
												max={item.product?.stockQuantity}
												value={item.quantity}
												on:change={(e) => {
													const target = e.target as HTMLInputElement;
													if (target) {
														updateItemQuantity(index, parseInt(target.value));
													}
												}}
												class="w-full text-sm border border-gray-300 rounded px-2 py-1"
											/>
										</div>
										<div>
											<!-- svelte-ignore a11y_label_has_associated_control -->
											<label class="text-xs text-gray-600">Preço unit.</label>
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
												class="w-full text-sm border border-gray-300 rounded px-2 py-1"
											/>
										</div>
										<div>
											<!-- svelte-ignore a11y_label_has_associated_control -->
											<label class="text-xs text-gray-600">Total</label>
											<div class="text-sm font-medium py-1">
												R$ {(item.quantity * item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
											</div>
										</div>
									</div>
								</div>
							{/each}
							
							<!-- Total -->
							<div class="border-t pt-3">
								<div class="flex justify-between items-center font-semibold">
									<span>Total do pedido:</span>
									<span class="text-lg">R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
								</div>
							</div>
						</div>
					{:else}
						<div class="text-center py-8 text-gray-500">
							<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 21h6" />
							</svg>
							<p class="mt-2">Nenhum produto adicionado</p>
							<p class="text-sm">Use a busca acima para adicionar produtos</p>
						</div>
					{/if}
					
					{#if errors.items}
						<p class="text-sm text-red-600">{errors.items}</p>
					{/if}
				</div>
				
				<!-- Third Column - Payments -->
				<div class="space-y-4 xl:col-span-1 lg:col-span-2">
					<h4 class="text-md font-medium text-gray-900">Meios de Pagamento</h4>
					
					<!-- Payment Method Selection -->
					<div class="relative">
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
								<div class="border rounded-lg p-3 bg-gray-50">
									<div class="flex justify-between items-start mb-2">
										<div class="flex-1">
											<div class="font-medium text-sm">{payment.paymentMethod?.name}</div>
											<div class="text-xs text-gray-500">{payment.paymentMethod?.description || ''}</div>
										</div>
										<!-- svelte-ignore a11y_consider_explicit_label -->
										<button
											type="button"
											on:click={() => removePayment(index)}
											class="text-red-600 hover:text-red-800"
											title="Remover pagamento"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
									<div class="grid grid-cols-2 gap-2">
										<div>
											<!-- svelte-ignore a11y_label_has_associated_control -->
											<label class="text-xs text-gray-600">Valor</label>
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
												class="w-full text-sm border border-gray-300 rounded px-2 py-1"
												placeholder="0,00"
											/>
										</div>
										<div>
											<!-- svelte-ignore a11y_label_has_associated_control -->
											<label class="text-xs text-gray-600">Observações</label>
											<input
												type="text"
												value={payment.notes || ''}
												on:change={(e) => {
													const target = e.target as HTMLInputElement;
													if (target) {
														updatePaymentNotes(index, target.value);
													}
												}}
												class="w-full text-sm border border-gray-300 rounded px-2 py-1"
												placeholder="Opcional"
											/>
										</div>
									</div>
								</div>
							{/each}
							
							<!-- Payment Summary -->
							<div class="border-t pt-3 space-y-2">
								<div class="flex justify-between items-center text-sm">
									<span>Total do pedido:</span>
									<span class="font-medium">R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
								</div>
								<div class="flex justify-between items-center text-sm">
									<span>Total pago:</span>
									<span class="font-medium">R$ {totalPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
								</div>
								<div class="flex justify-between items-center text-sm font-semibold border-t pt-2">
									<span>Saldo:</span>
									<span class="{paymentBalance > 0.01 ? 'text-red-600' : paymentBalance < -0.01 ? 'text-orange-600' : 'text-green-600'}">
										R$ {paymentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
									</span>
								</div>
								{#if Math.abs(paymentBalance) > 0.01}
									<div class="text-xs text-gray-500">
										{#if paymentBalance > 0}
											Faltam R$ {paymentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para quitar
										{:else}
											Valor excedente de R$ {Math.abs(paymentBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
										{/if}
									</div>
								{/if}
							</div>
						</div>
					{:else}
						<div class="text-center py-8 text-gray-500">
							<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z" />
							</svg>
							<p class="mt-2">Nenhum meio de pagamento adicionado</p>
							<p class="text-sm">Selecione os meios de pagamento acima</p>
						</div>
					{/if}
					
					{#if errors.payments}
						<p class="text-sm text-red-600">{errors.payments}</p>
					{/if}
				</div>
			</div>
			
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