<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { orders } from '$lib/stores/orders.js';
	import { notify } from '$lib/stores/ui.js';
	
	const dispatch = createEventDispatcher();
	
	export let orderId: number;
	
	let orderData: any = null;
	let loading = true;
	let error: string | null = null;
	let updatingItems = new Set<number>();
	
	// Load order details when component mounts
	$: if (orderId) {
		loadOrderDetails();
	}
	
	async function loadOrderDetails() {
		loading = true;
		error = null;
		
		try {
			const result = await orders.getOrder(orderId);
			if (result.success) {
				orderData = result.order;
			} else {
				error = result.error || 'Erro ao carregar detalhes do pedido';
			}
		} catch (err) {
			error = 'Erro de conexão';
		} finally {
			loading = false;
		}
	}
	
	// Function to update item status
	async function updateItemStatus(itemId: number, field: 'itemTaken' | 'itemReturned', value: boolean) {
		updatingItems.add(itemId);
		updatingItems = updatingItems; // Trigger reactivity
		
		try {
			const orderItems = [{ id: itemId, [field]: value }];
			const result = await orders.updateOrder(orderId, { orderItems });
			
			if (result.success) {
				notify.success(`Status do item atualizado com sucesso!`);
				// Update local data
				orderData.orderItems = orderData.orderItems.map((item: any) => 
					item.id === itemId ? { ...item, [field]: value } : item
				);
			} else {
				notify.error(result.error || 'Erro ao atualizar status do item');
			}
		} catch (err) {
			notify.error('Erro de conexão');
		} finally {
			updatingItems.delete(itemId);
			updatingItems = updatingItems; // Trigger reactivity
		}
	}
	
	function handleClose() {
		dispatch('close');
	}
	
	function getStatusColor(status: string) {
		const colors = {
			PENDING: 'bg-yellow-100 text-yellow-800',
			CONFIRMED: 'bg-blue-100 text-blue-800',
			DELIVERED: 'bg-green-100 text-green-800',
			RETURNED: 'bg-purple-100 text-purple-800',
			CANCELLED: 'bg-red-100 text-red-800'
		};
		return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
	}
	
	function getStatusLabel(status: string) {
		const labels = {
			PENDING: 'Pendente',
			CONFIRMED: 'Confirmado',
			DELIVERED: 'Entregue',
			RETURNED: 'Devolvido',
			CANCELLED: 'Cancelado'
		};
		return labels[status as keyof typeof labels] || status;
	}
	
	function getOrderTypeLabel(type: string) {
		return type === 'RENTAL' ? 'Aluguel' : 'Venda';
	}
</script>

<svelte:head>
	<title>Detalhes do Pedido - Mr. Fantasy</title>
</svelte:head>

<!-- Modal Backdrop -->
<div 
	class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
	role="dialog"
	aria-modal="true"
	aria-labelledby="modal-title"
	on:click={handleClose}
	on:keydown={(e) => {
		if (e.key === 'Escape') {
			handleClose();
		}
	}}
	tabindex="-1"
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
			<h3 id="modal-title" class="text-lg font-medium text-gray-900">
				{#if orderData}
					Detalhes do Pedido {orderData.orderNumber}
				{:else}
					Detalhes do Pedido
				{/if}
			</h3>
			<button
				on:click={handleClose}
				class="text-gray-400 hover:text-gray-600 transition-colors"
				aria-label="Fechar modal"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
		
		<!-- Modal Body -->
		<div class="mt-4">
			{#if loading}
				<div class="flex items-center justify-center py-8">
					<svg class="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					<span class="ml-2 text-gray-600">Carregando detalhes...</span>
				</div>
			{:else if error}
				<div class="text-center py-8">
					<div class="text-red-600 mb-4">
						<svg class="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
						</svg>
					</div>
					<h3 class="text-lg font-medium text-gray-900 mb-2">Erro ao carregar detalhes</h3>
					<p class="text-gray-600 mb-4">{error}</p>
					<button
						on:click={loadOrderDetails}
						class="btn btn-primary"
					>
						Tentar novamente
					</button>
				</div>
			{:else if orderData}
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<!-- Left Column - Order Info -->
					<div class="space-y-6">
						<div class="bg-gray-50 rounded-lg p-4">
							<h4 class="text-sm font-medium text-gray-900 mb-3">Informações do Pedido</h4>
							<dl class="space-y-2">
								<div class="flex justify-between">
									<dt class="text-sm text-gray-600">Número:</dt>
									<dd class="text-sm font-medium text-gray-900">{orderData.orderNumber}</dd>
								</div>
								<div class="flex justify-between">
									<dt class="text-sm text-gray-600">Tipo:</dt>
									<dd class="text-sm font-medium text-gray-900">
										<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {orderData.orderType === 'RENTAL' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
											{getOrderTypeLabel(orderData.orderType)}
										</span>
									</dd>
								</div>
								<div class="flex justify-between">
									<dt class="text-sm text-gray-600">Status:</dt>
									<dd class="text-sm font-medium text-gray-900">
										<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(orderData.status)}">
											{getStatusLabel(orderData.status)}
										</span>
									</dd>
								</div>
								<div class="flex justify-between">
									<dt class="text-sm text-gray-600">Data do Pedido:</dt>
									<dd class="text-sm font-medium text-gray-900">{new Date(orderData.orderDate).toLocaleDateString('pt-BR')}</dd>
								</div>
								{#if orderData.orderType === 'RENTAL'}
									{#if orderData.rentalStartDate}
										<div class="flex justify-between">
											<dt class="text-sm text-gray-600">Início do Aluguel:</dt>
											<dd class="text-sm font-medium text-gray-900">{new Date(orderData.rentalStartDate).toLocaleDateString('pt-BR')}</dd>
										</div>
									{/if}
									{#if orderData.rentalEndDate}
										<div class="flex justify-between">
											<dt class="text-sm text-gray-600">Fim do Aluguel:</dt>
											<dd class="text-sm font-medium text-gray-900">{new Date(orderData.rentalEndDate).toLocaleDateString('pt-BR')}</dd>
										</div>
									{/if}
									{#if orderData.returnDate}
										<div class="flex justify-between">
											<dt class="text-sm text-gray-600">Data de Devolução:</dt>
											<dd class="text-sm font-medium text-gray-900">{new Date(orderData.returnDate).toLocaleDateString('pt-BR')}</dd>
										</div>
									{/if}
								{/if}
								<div class="flex justify-between pt-2 border-t">
									<dt class="text-sm font-medium text-gray-900">Valor Total:</dt>
									<dd class="text-sm font-bold text-gray-900">
										R$ {orderData.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
									</dd>
								</div>
							</dl>
						</div>
						
						<!-- Customer Info -->
						<div class="bg-gray-50 rounded-lg p-4">
							<h4 class="text-sm font-medium text-gray-900 mb-3">Informações do Cliente</h4>
							<dl class="space-y-2">
								<div class="flex justify-between">
									<dt class="text-sm text-gray-600">Nome:</dt>
									<dd class="text-sm font-medium text-gray-900">{orderData.customer?.name}</dd>
								</div>
								<div class="flex justify-between">
									<dt class="text-sm text-gray-600">Email:</dt>
									<dd class="text-sm font-medium text-gray-900">{orderData.customer?.email}</dd>
								</div>
								<div class="flex justify-between">
									<dt class="text-sm text-gray-600">Telefone:</dt>
									<dd class="text-sm font-medium text-gray-900">{orderData.customer?.phone}</dd>
								</div>
							</dl>
						</div>
						
						<!-- Notes -->
						{#if orderData.notes}
							<div class="bg-gray-50 rounded-lg p-4">
								<h4 class="text-sm font-medium text-gray-900 mb-3">Observações</h4>
								<p class="text-sm text-gray-700">{orderData.notes}</p>
							</div>
						{/if}
					</div>
					
					<!-- Right Column - Order Items -->
					<div class="space-y-6">
						<div class="bg-gray-50 rounded-lg p-4">
							<h4 class="text-sm font-medium text-gray-900 mb-3">Itens do Pedido</h4>
							<div class="space-y-3">
								{#each orderData.orderItems as item}
									<div class="bg-white rounded-lg p-3 border">
										<div class="flex justify-between items-start mb-2">
											<div class="flex-1">
												<div class="font-medium text-sm text-gray-900">{item.product?.name}</div>
												<div class="text-xs text-gray-500">SKU: {item.product?.sku}</div>
												{#if item.product?.group}
													<div class="text-xs text-gray-500">Grupo: {item.product.group.name}</div>
												{/if}
											</div>
											<div class="text-right">
												<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {item.itemType === 'RENTAL' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
													{item.itemType === 'RENTAL' ? 'Aluguel' : 'Venda'}
												</span>
											</div>
										</div>
										<div class="grid grid-cols-3 gap-4 text-sm">
											<div>
												<span class="text-gray-600">Qtd:</span>
												<span class="font-medium ml-1">{item.quantity}</span>
											</div>
											<div>
												<span class="text-gray-600">Preço Unit.:</span>
												<span class="font-medium ml-1">R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
											</div>
											<div>
												<span class="text-gray-600">Total:</span>
												<span class="font-medium ml-1">R$ {item.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
											</div>
										</div>
										<!-- Status do Item -->
										<div class="mt-3 pt-3 border-t border-gray-200">
											<div class="flex items-center justify-between mb-2">
												<span class="text-sm text-gray-600">Status da Retirada:</span>
												<label class="inline-flex items-center cursor-pointer">
													<input 
														type="checkbox" 
														checked={item.itemTaken}
														disabled={updatingItems.has(item.id)}
														on:change={(e) => {
															const target = e.target as HTMLInputElement;
															updateItemStatus(item.id, 'itemTaken', target.checked);
														}}
														class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
													/>
													<span class="ml-2 text-sm font-medium {item.itemTaken ? 'text-green-800' : 'text-gray-700'}">
														{item.itemTaken ? 'Retirado' : 'Não retirado'}
													</span>
													{#if updatingItems.has(item.id)}
														<svg class="animate-spin ml-2 h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24">
															<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
															<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
														</svg>
													{/if}
												</label>
											</div>
											{#if item.itemType === 'RENTAL'}
												<div class="flex items-center justify-between">
													<span class="text-sm text-gray-600">Status da Devolução:</span>
													<label class="inline-flex items-center cursor-pointer">
														<input 
															type="checkbox" 
															checked={item.itemReturned}
															disabled={updatingItems.has(item.id)}
															on:change={(e) => {
																const target = e.target as HTMLInputElement;
																updateItemStatus(item.id, 'itemReturned', target.checked);
															}}
															class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
														/>
														<span class="ml-2 text-sm font-medium {item.itemReturned ? 'text-purple-800' : 'text-gray-700'}">
															{item.itemReturned ? 'Devolvido' : 'Não devolvido'}
														</span>
														{#if updatingItems.has(item.id)}
															<svg class="animate-spin ml-2 h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24">
																<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
																<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
															</svg>
														{/if}
													</label>
												</div>
											{/if}
										</div>
									</div>
								{/each}
								
								<!-- Total -->
								<div class="border-t pt-3">
									<div class="flex justify-between items-center font-semibold">
										<span>Total do Pedido:</span>
										<span class="text-lg">R$ {orderData.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
									</div>
								</div>
							</div>
						</div>
						
						<!-- Payment Methods -->
						{#if orderData.orderPayments && orderData.orderPayments.length > 0}
							<div class="bg-gray-50 rounded-lg p-4">
								<h4 class="text-sm font-medium text-gray-900 mb-3">Meios de Pagamento</h4>
								<div class="space-y-3">
									{#each orderData.orderPayments as payment}
										<div class="bg-white rounded-lg p-3 border">
											<div class="flex justify-between items-start mb-2">
												<div class="flex-1">
													<div class="font-medium text-sm text-gray-900">{payment.paymentMethod?.name}</div>
													{#if payment.paymentMethod?.description}
														<div class="text-xs text-gray-500">{payment.paymentMethod.description}</div>
													{/if}
													{#if payment.notes}
														<div class="text-xs text-gray-600 mt-1">Obs: {payment.notes}</div>
													{/if}
												</div>
												<div class="text-right">
													<div class="text-sm font-medium text-gray-900">
														R$ {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
													</div>
												</div>
											</div>
										</div>
									{/each}
									
									<!-- Payment Summary -->
									<div class="border-t pt-3 mt-3">
										<div class="flex justify-between items-center text-sm mb-1">
											<span class="text-gray-600">Total Pago:</span>
											<span class="font-medium text-gray-900">
												R$ {orderData.orderPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
											</span>
										</div>
										{#if orderData.orderPayments && orderData.orderPayments.length > 0}
											{@const totalPaid = orderData.orderPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0)}
											{@const balance = Number(orderData.totalAmount) - totalPaid}
											<div class="flex justify-between items-center text-sm font-semibold">
												<span>Status do Pagamento:</span>
												<span class="{Math.abs(balance) <= 0.01 ? 'text-green-600' : balance > 0 ? 'text-red-600' : 'text-orange-600'}">
													{#if Math.abs(balance) <= 0.01}
														Quitado
													{:else if balance > 0}
														Pendente (R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
													{:else}
														Excedente (R$ {Math.abs(balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
													{/if}
												</span>
											</div>
										{/if}
									</div>
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
		
		<!-- Modal Footer -->
		<div class="flex items-center justify-end space-x-3 pt-6 border-t mt-6">
			<button
				on:click={handleClose}
				class="btn btn-secondary"
			>
				Fechar
			</button>
		</div>
	</div>
</div>