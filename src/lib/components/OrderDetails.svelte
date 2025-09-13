<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { orders } from '$lib/stores/orders.js';
	import { notificationStore } from '$lib/stores/notifications.js';
	import { user, isManager } from '$lib/stores/auth.js';
    import { notify } from '$lib/stores/ui';
	
	const dispatch = createEventDispatcher();
	
	export let orderId: number;
	
	let orderData: any = null;
	let loading = true;
	let error: string | null = null;
	let updatingItems = new Set<number>();
	let activeTab = 'items'; // 'items', 'details', or 'edit-dates'
	let editingDates = false;
	let newRentalStartDate = '';
	let newRentalEndDate = '';
	let dateErrors: { start?: string; end?: string } = {};
	
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
				// Inicializar valores dos campos de edição
				if (orderData.rentalStartDate) {
					newRentalStartDate = new Date(orderData.rentalStartDate).toISOString().split('T')[0];
				}
				if (orderData.rentalEndDate) {
					newRentalEndDate = new Date(orderData.rentalEndDate).toISOString().split('T')[0];
				}
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
				notificationStore.success(`Status do item atualizado com sucesso!`);
				// Update local data
				orderData.orderItems = orderData.orderItems.map((item: any) => 
					item.id === itemId ? { ...item, [field]: value } : item
				);
			} else {
				notificationStore.error(result.error || 'Erro ao atualizar status do item');
			}
		} catch (err) {
			notificationStore.error('Erro de conexão');
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
	
	// Função para verificar se o pedido está cancelado
	function isOrderCancelled() {
		return orderData?.status === 'CANCELLED';
	}
		
		function getOrderTypeLabel() {
			if (orderData && orderData.orderItems) {
				const hasRentalItems = orderData.orderItems.some((item: { itemType: string; }) => item.itemType === 'RENTAL');
				return hasRentalItems ? 'Aluguel' : 'Venda';
			}
			return 'Venda';
		}
		
		// Funções para edição de datas
		function canEditDates() {
			if (!orderData) return false;
			const hasRentalItems = orderData.orderItems?.some((item: any) => item.itemType === 'RENTAL');
			return hasRentalItems && !['DELIVERED', 'RETURNED', 'CANCELLED'].includes(orderData.status);
		}
		
		function validateDates() {
			dateErrors = {};
				
			if (!newRentalStartDate || !newRentalEndDate) {
				return false;
			}
		
			const startDate = new Date(newRentalStartDate);
			const endDate = new Date(newRentalEndDate);
			const orderDate = new Date(orderData.orderDate);
		
			// Validar que data de início não é anterior à data do pedido
			if (startDate < orderDate) {
				dateErrors.start = 'Data de início não pode ser anterior à data do pedido';
			}
		
			// Validar que data de início é anterior à data de fim
			if (startDate >= endDate) {
				dateErrors.end = 'Data de fim deve ser posterior à data de início';
			}
		
			return Object.keys(dateErrors).length === 0;
		}
		
		async function saveDateChanges() {
			if (!validateDates()) {
				return;
			}
		
			editingDates = true;
				
			try {
				const startDate = newRentalStartDate ? new Date(newRentalStartDate) : undefined;
				const endDate = newRentalEndDate ? new Date(newRentalEndDate) : undefined;
					
				const result = await orders.updateRentalDates(orderId, startDate, endDate);
					
				if (result.success) {
					notificationStore.success('Datas de aluguel atualizadas com sucesso!');
					orderData = result.order;
					activeTab = 'details'; // Voltar para aba de detalhes
				} else {
					notificationStore.error(result.error || 'Erro ao atualizar datas');
				}
			} catch (err) {
				notificationStore.error('Erro de conexão');
			} finally {
				editingDates = false;
			}
		}
		
		function cancelDateChanges() {
			// Restaurar valores originais
			if (orderData.rentalStartDate) {
				newRentalStartDate = new Date(orderData.rentalStartDate).toISOString().split('T')[0];
			}
			if (orderData.rentalEndDate) {
				newRentalEndDate = new Date(orderData.rentalEndDate).toISOString().split('T')[0];
			}
			dateErrors = {};
			activeTab = 'details';
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
				<!-- Tab Navigation -->
				<div class="border-b border-gray-200 mb-6">
					<nav class="-mb-px flex space-x-8" aria-label="Tabs">
						<button
							type="button"
							on:click={() => activeTab = 'items'}
							class="{activeTab === 'items' 
								? 'border-primary-500 text-primary-600' 
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
							} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
						>
							<div class="flex items-center">
								<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
								</svg>
								Itens do Pedido
							</div>
						</button>
						<button
							type="button"
							on:click={() => activeTab = 'details'}
							class="{activeTab === 'details' 
								? 'border-primary-500 text-primary-600' 
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
							} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
						>
							<div class="flex items-center">
								<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
								Detalhes e Pagamentos
							</div>
						</button>
						{#if canEditDates()}
							<button
								type="button"
								on:click={() => activeTab = 'edit-dates'}
								class="{activeTab === 'edit-dates' 
									? 'border-primary-500 text-primary-600' 
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
								} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
							>
								<div class="flex items-center">
									<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
									</svg>
									Editar Datas
								</div>
							</button>
						{/if}
					</nav>
				</div>
				<!-- Tab Content -->
				{#if activeTab === 'items'}
					<!-- Items Tab - Full Width for Items -->
					<div class="space-y-4">
						{#each orderData.orderItems as item}
							<div class="bg-white rounded-lg p-6 border shadow-sm">
								<!-- Item Header -->
								<div class="flex justify-between items-start mb-4">
									<div class="flex-1">
										<div class="font-semibold text-xl text-gray-900">{item.product?.name}</div>
										<div class="text-sm text-gray-500 mt-1">
											<span class="font-medium">SKU:</span> {item.product?.sku}
											{#if item.product?.group}
												• <span class="font-medium">Grupo:</span> {item.product.group.name}
											{/if}
										</div>
									</div>
									<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {item.itemType === 'RENTAL' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
										{item.itemType === 'RENTAL' ? 'Aluguel' : 'Venda'}
									</span>
								</div>
								
								<!-- Item Details Grid -->
								<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 bg-gray-50 rounded-lg p-4">
									<div class="text-center">
										<div class="text-sm text-gray-600 mb-1">Quantidade</div>
										<div class="text-2xl font-bold text-gray-900">{item.quantity}</div>
									</div>
									<div class="text-center">
										<div class="text-sm text-gray-600 mb-1">Preço Unitário</div>
										<div class="text-2xl font-bold text-gray-900">R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
									</div>
									{#if item.discountValue && item.discountValue > 0}
										<div class="text-center">
											<div class="text-sm text-gray-600 mb-1">Desconto</div>
											<div class="text-2xl font-bold text-orange-600">
												{item.discountType === 'PERCENTAGE' ? `${item.discountValue}%` : `R$ ${item.discountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
											</div>
										</div>
									{/if}
									<div class="text-center">
										<div class="text-sm text-gray-600 mb-1">Total</div>
										<div class="text-3xl font-bold text-primary-600">R$ {item.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
									</div>
								</div>
								
								<!-- Item Status Controls -->
								<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div class="bg-gray-50 rounded-lg p-4">
										<div class="flex items-center justify-between">
											<span class="text-sm font-medium text-gray-700">Status da Retirada</span>
											<label class="inline-flex items-center {isOrderCancelled() ? 'cursor-not-allowed' : 'cursor-pointer'}">
												<input type="checkbox" checked={item.itemTaken} disabled={updatingItems.has(item.id) || isOrderCancelled()}
													on:change={(e) => {
														const target = e.target as HTMLInputElement;
														if (target) {
															updateItemStatus(item.id, 'itemTaken', target.checked);
														}
													}}
													class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5 {isOrderCancelled() ? 'opacity-50' : ''}"/>
												<span class="ml-3 text-lg font-medium {item.itemTaken ? 'text-green-800' : 'text-gray-700'} {isOrderCancelled() ? 'opacity-50' : ''}">
													{item.itemTaken ? 'Retirado' : 'Não retirado'}
												</span>
											</label>
										</div>
										{#if isOrderCancelled()}
											<div class="mt-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded border">
												<span>Controle desabilitado - Pedido cancelado</span>
											</div>
										{/if}
									</div>
									{#if item.itemType === 'RENTAL'}
										<div class="bg-gray-50 rounded-lg p-4">
											<div class="flex items-center justify-between">
												<span class="text-sm font-medium text-gray-700">Status da Devolução</span>
												<div class="flex flex-col items-end">
													<label class="inline-flex items-center {isOrderCancelled() ? 'cursor-not-allowed' : 'cursor-pointer'}">
														<input type="checkbox" checked={item.itemReturned} disabled={updatingItems.has(item.id) || isOrderCancelled()}
															on:change={(e) => {
																const target = e.target as HTMLInputElement;
																if (!target) return;
																if (item.itemReturned === true && target.checked === false && !$isManager) {
																	target.checked = true;
																	notify.error('Somente usuários administrativos ou gerentes podem reverter o status de devolução');
																	return;
																}
																updateItemStatus(item.id, 'itemReturned', target.checked);
															}}
															class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5 {isOrderCancelled() ? 'opacity-50' : ''}"/>
														<span class="ml-3 text-lg font-medium {item.itemReturned ? 'text-purple-800' : 'text-gray-700'} {isOrderCancelled() ? 'opacity-50' : ''}">
															{item.itemReturned ? 'Devolvido' : 'Não devolvido'}
														</span>
													</label>
													{#if isOrderCancelled()}
														<div class="mt-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded border">
															<span>Controle desabilitado - Pedido cancelado</span>
														</div>
													{:else if item.itemReturned && !$isManager}
														<div class="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
															<span>Apenas admin/gerente pode reverter devolução</span>
														</div>
													{/if}
												</div>
											</div>
										</div>
									{/if}
								</div>
							</div>
						{/each}
						
						<!-- Total do Pedido -->
						<div class="bg-white rounded-lg p-6 border border-primary-200 shadow-sm">
							<div class="flex justify-between items-center">
								<span class="text-xl font-semibold text-gray-900">Total do Pedido:</span>
								<span class="text-3xl font-bold text-primary-600">R$ {orderData.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
							</div>
						</div>
					</div>
				{:else if activeTab === 'edit-dates'}
					<!-- Edit Dates Tab -->
					<div class="space-y-6">
						<div class="bg-white rounded-lg p-6 border">
							<div class="flex items-center justify-between mb-6">
								<h4 class="text-lg font-medium text-gray-900">Editar Datas do Aluguel</h4>
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
									Pedido #{orderData.orderNumber}
								</span>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
								<!-- Data de Início -->
								<div>
									<label for="newRentalStartDate" class="block text-sm font-medium text-gray-700 mb-2">
										Data de Início do Aluguel *
									</label>
									<input
										id="newRentalStartDate"
										type="date"
										bind:value={newRentalStartDate}
										on:input={() => validateDates()}
										min={new Date(orderData.orderDate).toISOString().split('T')[0]}
										class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 {dateErrors.start ? 'border-red-300' : ''} {isOrderCancelled() ? 'opacity-50' : ''}"
										disabled={editingDates || isOrderCancelled()}
									/>
									{#if dateErrors.start}
										<p class="mt-1 text-sm text-red-600">{dateErrors.start}</p>
									{/if}
									<p class="mt-1 text-xs text-gray-500">
										Data mínima: {new Date(orderData.orderDate).toLocaleDateString('pt-BR')}
									</p>
								</div>

								<!-- Data de Fim -->
								<div>
									<label for="newRentalEndDate" class="block text-sm font-medium text-gray-700 mb-2">
										Data de Fim do Aluguel *
									</label>
									<input
										id="newRentalEndDate"
										type="date"
										bind:value={newRentalEndDate}
										on:input={() => validateDates()}
										min={newRentalStartDate || new Date(orderData.orderDate).toISOString().split('T')[0]}
										class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 {dateErrors.end ? 'border-red-300' : ''} {isOrderCancelled() ? 'opacity-50' : ''}"
										disabled={editingDates || isOrderCancelled()}
									/>
									{#if dateErrors.end}
										<p class="mt-1 text-sm text-red-600">{dateErrors.end}</p>
									{/if}
								</div>
							</div>

							<!-- Informações atuais -->
							<div class="bg-gray-50 rounded-lg p-4 mb-6">
								<h5 class="text-sm font-medium text-gray-900 mb-3">Datas Atuais</h5>
								<div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
									<div>
										<span class="text-gray-600">Data do Pedido:</span>
										<div class="font-medium">{new Date(orderData.orderDate).toLocaleDateString('pt-BR')}</div>
									</div>
									{#if orderData.rentalStartDate}
										<div>
											<span class="text-gray-600">Início Atual:</span>
											<div class="font-medium">{new Date(orderData.rentalStartDate).toLocaleDateString('pt-BR')}</div>
										</div>
									{/if}
									{#if orderData.rentalEndDate}
										<div>
											<span class="text-gray-600">Fim Atual:</span>
											<div class="font-medium">{new Date(orderData.rentalEndDate).toLocaleDateString('pt-BR')}</div>
										</div>
									{/if}
								</div>
							</div>

							<!-- Aviso para pedido cancelado -->
							{#if isOrderCancelled()}
								<div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
									<div class="flex">
										<svg class="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
										</svg>
										<div class="text-sm">
											<p class="text-red-800 font-medium">Edição não permitida</p>
											<p class="text-red-700 mt-1">As datas do aluguel não podem ser editadas pois o pedido está <strong>Cancelado</strong>.</p>
										</div>
									</div>
								</div>
							{/if}
													
							<!-- Botões de Ação -->
							<div class="flex items-center justify-end space-x-3">
								<button
									type="button"
									on:click={cancelDateChanges}
									class="btn btn-secondary"
									disabled={editingDates || isOrderCancelled()}
								>
									Cancelar
								</button>
								<button
									type="button"
									on:click={saveDateChanges}
									class="btn btn-primary {isOrderCancelled() ? 'opacity-50' : ''}"
									disabled={editingDates || isOrderCancelled() || !newRentalStartDate || !newRentalEndDate || Object.keys(dateErrors).length > 0}
								>
									{#if editingDates}
										<svg class="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
											<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
											<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
										Salvando...
									{:else}
										Salvar Alterações
									{/if}
								</button>
							</div>
						</div>
					</div>
				{:else}
					<!-- Details Tab - Order Info, Customer Info, and Payments -->
					<div class="space-y-6">
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
										{#if orderData.orderItems}
											{@const hasRentalItems = orderData.orderItems.some((item: any) => item.itemType === 'RENTAL')}
											<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {hasRentalItems ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
												{getOrderTypeLabel()}
											</span>
										{/if}
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
								{#if orderData.orderItems}
									{@const hasRentalItems = orderData.orderItems.some((item: any) => item.itemType === 'RENTAL')}
									{#if hasRentalItems}
									{#if orderData.rentalStartDate}
										<div class="flex justify-between">
											<dt class="text-sm text-gray-600">Início do Aluguel:</dt>
											<dd class="text-sm font-medium text-gray-900">
												{new Date(orderData.rentalStartDate).toLocaleDateString('pt-BR')}
												{#if canEditDates()}
													<button
														on:click={() => activeTab = 'edit-dates'}
														class="ml-2 text-xs text-primary-600 hover:text-primary-800 underline"
														title="Clique para editar as datas"
													>
														editar
													</button>
												{/if}
											</dd>
										</div>
									{/if}
									{#if orderData.rentalEndDate}
										<div class="flex justify-between">
											<dt class="text-sm text-gray-600">Fim do Aluguel:</dt>
											<dd class="text-sm font-medium text-gray-900">
												{new Date(orderData.rentalEndDate).toLocaleDateString('pt-BR')}
												{#if canEditDates()}
													<button
														on:click={() => activeTab = 'edit-dates'}
														class="ml-2 text-xs text-primary-600 hover:text-primary-800 underline"
														title="Clique para editar as datas"
													>
														editar
													</button>
												{/if}
											</dd>
										</div>
									{/if}
									{#if orderData.returnDate}
										<div class="flex justify-between">
											<dt class="text-sm text-gray-600">Data de Devolução:</dt>
											<dd class="text-sm font-medium text-gray-900">{new Date(orderData.returnDate).toLocaleDateString('pt-BR')}</dd>
										</div>
									{/if}
									{#if orderData.orderItems && orderData.orderItems.some((item: any) => item.itemType === 'RENTAL') && !canEditDates()}
										<div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
											<div class="flex">
												<svg class="w-5 h-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
													<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
												</svg>
												<div class="text-sm">
													<p class="text-amber-800 font-medium">Datas não podem ser editadas</p>
													<p class="text-amber-700 mt-1">As datas do aluguel não podem ser alteradas quando o pedido está <strong>Entregue</strong>, <strong>Devolvido</strong> ou <strong>Cancelado</strong>.</p>
												</div>
											</div>
										</div>
									{/if}
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