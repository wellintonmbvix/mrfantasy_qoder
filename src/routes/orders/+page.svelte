<script lang="ts">
	import { onMount } from 'svelte';
	import { orders } from '$lib/stores/orders.js';
	import { ui, notify } from '$lib/stores/ui.js';
	import OrderForm from '$lib/components/OrderForm.svelte';
	import OrderDetails from '$lib/components/OrderDetails.svelte';

	let search = '';
	let selectedStatus = '';
	let selectedOrderType = '';
	let orderDateFrom = '';
	let rentalStartDateFrom = '';
	let returnDateFrom = '';
	let currentPage = 1;
	const itemsPerPage = 10;
	
	// Reactive declarations
	let ordersData: any;
	let uiState: any;
	
	$: {
		ordersData = $orders;
		uiState = $ui;
	}

	onMount(() => {
		loadOrders();
	});

	async function loadOrders() {
		await orders.fetchOrders({
			search: search.trim(),
			status: selectedStatus || undefined,
			orderType: selectedOrderType || undefined,
			orderDateFrom: orderDateFrom || undefined,
			rentalStartDateFrom: rentalStartDateFrom || undefined,
			returnDateFrom: returnDateFrom || undefined,
			page: currentPage,
			limit: itemsPerPage
		});
	}

	function handleSearch() {
		currentPage = 1;
		loadOrders();
	}

	function resetFilters() {
		search = '';
		selectedStatus = '';
		selectedOrderType = '';
		orderDateFrom = '';
		rentalStartDateFrom = '';
		returnDateFrom = '';
		currentPage = 1;
		loadOrders();
	}

	function openCreateForm() {
		ui.openModal('orderForm');
	}

	async function handleOrderSubmit(event: CustomEvent) {
		const { order: orderData } = event.detail;

		const result = await orders.createOrder(orderData);

		if (result.success) {
			notify.success('Pedido criado com sucesso!');
			ui.closeModal('orderForm');
			loadOrders();
		} else {
			notify.error(result.error || 'Erro ao criar pedido');
		}
	}

	async function updateOrderStatus(orderId: number, status: string) {
		const result = await orders.updateOrder(orderId, { status: status as any });

		if (result.success) {
			notify.success('Status atualizado com sucesso!');
			loadOrders();
		} else {
			notify.error(result.error || 'Erro ao atualizar status');
		}
	}

	function changePage(page: number) {
		currentPage = page;
		loadOrders();
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'PENDING':
				return 'bg-yellow-100 text-yellow-800';
			case 'CONFIRMED':
				return 'bg-blue-100 text-blue-800';
			case 'DELIVERED':
				return 'bg-green-100 text-green-800';
			case 'RETURNED':
				return 'bg-gray-100 text-gray-800';
			case 'CANCELLED':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	function getStatusLabel(status: string) {
		switch (status) {
			case 'PENDING':
				return 'Pendente';
			case 'CONFIRMED':
				return 'Confirmado';
			case 'DELIVERED':
				return 'Entregue';
			case 'RETURNED':
				return 'Devolvido';
			case 'CANCELLED':
				return 'Cancelado';
			default:
				return status;
		}
	}

	function getOrderTypeLabel(type: string) {
		return type === 'RENTAL' ? 'Aluguel' : 'Venda';
	}

	function viewOrderDetails(orderId: number) {
		ui.setSelectedOrderId(orderId);
		ui.openModal('orderDetails');
	}

	function isRentalOverdue(order: any) {
		if (order.orderType !== 'RENTAL' || order.status !== 'DELIVERED' || !order.rentalEndDate) {
			return false;
		}
		return new Date(order.rentalEndDate) < new Date();
	}

	// Function to get item status summary
	function getItemStatusSummary(orderItems: any[]) {
		const taken = orderItems.filter(item => item.itemTaken).length;
		const returned = orderItems.filter(item => item.itemReturned).length;
		const total = orderItems.length;
		
		return { taken, returned, total };
	}
</script>

<svelte:head>
	<title>Pedidos - Mr. Fantasy</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-2xl font-semibold text-gray-900">Pedidos</h1>
			<p class="mt-1 text-sm text-gray-500">
				Gerencie todos os pedidos de aluguel e venda
			</p>
		</div>
		<button
			on:click={openCreateForm}
			class="btn btn-primary"
		>
			<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Novo Pedido
		</button>
	</div>

	<!-- Search and Filters -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
		<div class="md:col-span-2">
			<div class="relative">
				<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
				</div>
				<input
					type="text"
					bind:value={search}
					on:keydown={(e) => e.key === 'Enter' && handleSearch()}
					placeholder="Buscar por número, cliente..."
					class="form-input pl-10"
				/>
			</div>
		</div>
		<div>
			<select bind:value={selectedStatus} class="form-input">
				<option value="">Todos os status</option>
				<option value="PENDING">Pendente</option>
				<option value="CONFIRMED">Confirmado</option>
				<option value="DELIVERED">Entregue</option>
				<option value="RETURNED">Devolvido</option>
				<option value="CANCELLED">Cancelado</option>
			</select>
		</div>
		<div>
			<select bind:value={selectedOrderType} class="form-input">
				<option value="">Todos os tipos</option>
				<option value="RENTAL">Aluguel</option>
				<option value="SALE">Venda</option>
			</select>
		</div>
	</div>

	<!-- Date Filters -->
	<div class="bg-gray-50 p-4 rounded-lg">
		<h3 class="text-sm font-medium text-gray-700 mb-3">Filtros por Data</h3>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div>
				<label for="orderDateFrom" class="block text-xs font-medium text-gray-700 mb-1">
					Data do Pedido (a partir de)
				</label>
				<input
					id="orderDateFrom"
					type="date"
					bind:value={orderDateFrom}
					on:change={handleSearch}
					class="form-input text-sm"
				/>
			</div>
			<div>
				<label for="rentalStartDateFrom" class="block text-xs font-medium text-gray-700 mb-1">
					Data de Início do Aluguel (a partir de)
				</label>
				<input
					id="rentalStartDateFrom"
					type="date"
					bind:value={rentalStartDateFrom}
					on:change={handleSearch}
					class="form-input text-sm"
				/>
			</div>
			<div>
				<label for="returnDateFrom" class="block text-xs font-medium text-gray-700 mb-1">
					Data de Devolução (a partir de)
				</label>
				<input
					id="returnDateFrom"
					type="date"
					bind:value={returnDateFrom}
					on:change={handleSearch}
					class="form-input text-sm"
				/>
			</div>
		</div>
	</div>

	<div class="flex space-x-2">
		<button on:click={handleSearch} class="btn btn-secondary">
			Buscar
		</button>
		<button on:click={resetFilters} class="btn btn-secondary">
			Limpar Filtros
		</button>
	</div>

	<!-- Error Message -->
	{#if ordersData.error}
		<div class="rounded-md bg-red-50 p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
					</svg>
				</div>
				<div class="ml-3">
					<p class="text-sm text-red-800">{ordersData.error}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Loading -->
	{#if ordersData.loading}
		<div class="text-center py-12">
			<svg class="animate-spin h-8 w-8 text-primary-600 mx-auto" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
			<p class="mt-2 text-sm text-gray-500">Carregando pedidos...</p>
		</div>
	{:else if ordersData.orders.length === 0}
		<!-- Empty State -->
		<div class="text-center py-12">
			<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0.621 0 1.125-.504 1.125-1.125V9.375c0-.621.504-1.125 1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900">Nenhum pedido encontrado</h3>
			<p class="mt-1 text-sm text-gray-500">Comece criando seu primeiro pedido.</p>
			<div class="mt-6">
				<button on:click={openCreateForm} class="btn btn-primary">
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					Novo Pedido
				</button>
			</div>
		</div>
	{:else}
		<!-- Orders Table -->
		<div class="card p-0 overflow-hidden">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Pedido
							</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Cliente
							</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Atendente
							</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Tipo
							</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Data
							</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Valor
							</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Itens
							</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Status
							</th>
							<th scope="col" class="relative px-6 py-3">
								<span class="sr-only">Ações</span>
							</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each ordersData.orders as order (order.id)}
							<tr class="hover:bg-gray-50 {isRentalOverdue(order) ? 'bg-red-50' : ''}">
								<td class="px-6 py-4 whitespace-nowrap">
									<div>
										<div class="text-sm font-medium text-gray-900">{order.orderNumber}</div>
										<div class="text-sm text-gray-500">{order.orderItems.length} item(s)</div>
									</div>
									{#if isRentalOverdue(order)}
										<div class="text-xs text-red-600 font-medium">⚠️ Em atraso</div>
									{/if}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									{#if order.customer}
										<div>
											<div class="text-sm font-medium text-gray-900">{order.customer.name}</div>
											<div class="text-sm text-gray-500">{order.customer.email}</div>
										</div>
									{:else}
										<span class="text-sm text-gray-400">Sem cliente</span>
									{/if}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									{#if order.attendant}
										<div>
											<div class="text-sm font-medium text-gray-900">{order.attendant.name}</div>
											<div class="text-sm text-gray-500">{order.attendant.abbreviation}</div>
										</div>
									{:else}
										<span class="text-sm text-gray-400">Não definido</span>
									{/if}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {order.orderType === 'RENTAL' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
										{getOrderTypeLabel(order.orderType)}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									<div>{new Date(order.orderDate).toLocaleDateString('pt-BR')}</div>
									{#if order.orderType === 'RENTAL' && order.rentalStartDate && order.rentalEndDate}
										<div class="text-xs text-gray-500">
											{new Date(order.rentalStartDate).toLocaleDateString('pt-BR')} - {new Date(order.rentalEndDate).toLocaleDateString('pt-BR')}
										</div>
									{/if}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
									R$ {order.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm text-gray-900">
										<div class="flex items-center space-x-2">
											<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
												✓ {getItemStatusSummary(order.orderItems).taken}/{getItemStatusSummary(order.orderItems).total}
											</span>
											{#if order.orderType === 'RENTAL' && getItemStatusSummary(order.orderItems).returned > 0}
												<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
													↵ {getItemStatusSummary(order.orderItems).returned}/{getItemStatusSummary(order.orderItems).total}
												</span>
											{/if}
										</div>
										<div class="text-xs text-gray-500 mt-1">
											{#if order.orderType === 'RENTAL'}
												Retirado/Devolvido
											{:else}
												Retirado
											{/if}
										</div>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<select
										value={order.status}
										on:change={(e) => {
											const target = e.target as HTMLSelectElement;
											if (target) {
												updateOrderStatus(order.id, target.value);
											}
										}}
										class="text-xs rounded-full px-2 py-1 border-0 {getStatusColor(order.status)} focus:ring-2 focus:ring-primary-500"
									>
										<option value="PENDING">Pendente</option>
										<option value="CONFIRMED">Confirmado</option>
										<option value="DELIVERED">Entregue</option>
										{#if order.orderType === 'RENTAL'}
											<option value="RETURNED">Devolvido</option>
										{/if}
										<option value="CANCELLED">Cancelado</option>
									</select>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
									<button
										on:click={() => viewOrderDetails(order.id)}
										class="text-primary-600 hover:text-primary-900"
										title="Ver detalhes"
										aria-label="Ver detalhes do pedido"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 616 0z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
										</svg>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			{#if ordersData.pagination && ordersData.pagination.pages > 1}
				<div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
					<div class="flex-1 flex justify-between sm:hidden">
						<button
							on:click={() => changePage(currentPage - 1)}
							disabled={currentPage <= 1}
							class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Anterior
						</button>
						<button
							on:click={() => changePage(currentPage + 1)}
							disabled={currentPage >= ordersData.pagination.pages}
							class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Próximo
						</button>
					</div>
					<div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
						<div>
							<p class="text-sm text-gray-700">
								Mostrando <span class="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
								até <span class="font-medium">{Math.min(currentPage * itemsPerPage, ordersData.pagination.total)}</span>
								de <span class="font-medium">{ordersData.pagination.total}</span> resultados
							</p>
						</div>
						<div>
							<nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
								<button
									on:click={() => changePage(currentPage - 1)}
									disabled={currentPage <= 1}
									class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<span class="sr-only">Anterior</span>
									<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
									</svg>
								</button>
								
								{#each Array.from({length: Math.min(ordersData.pagination.pages, 5)}, (_, i) => i + 1) as page}
									{#if page === currentPage}
										<span class="relative inline-flex items-center px-4 py-2 border border-primary-500 bg-primary-50 text-sm font-medium text-primary-600">
											{page}
										</span>
									{:else}
										<button
											on:click={() => changePage(page)}
											class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
										>
											{page}
										</button>
									{/if}
								{/each}

								<button
									on:click={() => changePage(currentPage + 1)}
									disabled={currentPage >= ordersData.pagination.pages}
									class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<span class="sr-only">Próximo</span>
									<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
									</svg>
								</button>
							</nav>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Order Form Modal -->
{#if uiState.modals.orderForm}
	<OrderForm
		on:submit={handleOrderSubmit}
		on:cancel={() => ui.closeModal('orderForm')}
	/>
{/if}

<!-- Order Details Modal -->
{#if uiState.modals.orderDetails && uiState.selectedOrderId}
	<OrderDetails
		orderId={uiState.selectedOrderId}
		on:close={() => ui.closeModal('orderDetails')}
	/>
{/if}