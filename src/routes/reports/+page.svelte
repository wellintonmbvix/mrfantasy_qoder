<script lang="ts">
	import { onMount } from 'svelte';
	import { notificationStore } from '$lib/stores/notifications.js';

	// Estados do componente
	let loading = false;
	let reportData: any[] = [];
	let pagination = {
		page: 1,
		limit: 50,
		total: 0,
		totalPages: 0,
		hasNext: false,
		hasPrev: false
	};

	// Filtros
	let filters = {
		dateFrom: '',
		dateTo: '',
		productId: '',
		itemStatus: 'not_taken'
	};

	// Estado para mostrar/ocultar filtros
	let showFilters = true;

	// Lista de produtos para o filtro
	let products: any[] = [];

	onMount(async () => {
		await loadProducts();
		await loadReport();
	});

	async function loadProducts() {
		try {
			const response = await fetch('/api/products?limit=1000&active=true');
			if (response.ok) {
				const data = await response.json();
				products = data.products || [];
			}
		} catch (error) {
			console.error('Erro ao carregar produtos:', error);
		}
	}

	async function loadReport() {
		loading = true;
		try {
			// Construir URL com parâmetros
			const searchParams = new URLSearchParams();
			
			if (filters.dateFrom) searchParams.set('dateFrom', filters.dateFrom);
			if (filters.dateTo) searchParams.set('dateTo', filters.dateTo);
			if (filters.productId) searchParams.set('productId', filters.productId);
			searchParams.set('itemStatus', filters.itemStatus);
			searchParams.set('page', pagination.page.toString());
			searchParams.set('limit', pagination.limit.toString());

			const response = await fetch(`/api/orders/rental-report?${searchParams}`);
			
			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					reportData = result.data;
					pagination = result.pagination;
				} else {
					notificationStore.error(result.error || 'Erro ao carregar relatório');
				}
			} else {
				const error = await response.json();
				notificationStore.error(error.error || 'Erro ao carregar relatório');
			}
		} catch (error) {
			console.error('Erro ao carregar relatório:', error);
			notificationStore.error('Erro de conexão ao carregar relatório');
		} finally {
			loading = false;
		}
	}

	function applyFilters() {
		pagination.page = 1;
		loadReport();
	}

	function resetFilters() {
		filters = {
			dateFrom: '',
			dateTo: '',
			productId: '',
			itemStatus: 'not_taken'
		};
		pagination.page = 1;
		loadReport();
	}

	function changePage(page: number) {
		pagination.page = page;
		loadReport();
	}

	function getStatusLabel(status: string) {
		switch (status) {
			case 'not_taken':
				return 'Não Retirados';
			case 'not_returned':
				return 'Não Devolvidos';
			case 'returned':
				return 'Devolvidos';
			default:
				return status;
		}
	}

	function getStatusColor(itemTaken: boolean, itemReturned: boolean) {
		if (!itemTaken) return 'bg-yellow-100 text-yellow-800';
		if (!itemReturned) return 'bg-blue-100 text-blue-800';
		return 'bg-green-100 text-green-800';
	}

	function getItemStatusText(itemTaken: boolean, itemReturned: boolean) {
		if (!itemTaken) return 'Não Retirado';
		if (!itemReturned) return 'Não Devolvido';
		return 'Devolvido';
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('pt-BR');
	}

		function formatCurrency(value: number) {
			return new Intl.NumberFormat('pt-BR', {
				style: 'currency',
				currency: 'BRL'
			}).format(value);
		}

		function printReport() {
			// Criar uma nova janela para impressão
			const printWindow = window.open('', '_blank', 'width=800,height=600');
			
			if (printWindow) {
				const printContent = generatePrintContent();
				printWindow.document.write(printContent);
				printWindow.document.close();
				
				// Aguardar o carregamento e imprimir
				printWindow.onload = () => {
					printWindow.print();
					printWindow.close();
				};
			}
		}

		function generatePrintContent(): string {
			const currentDate = new Date().toLocaleDateString('pt-BR', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});

			let html = `
				<!DOCTYPE html>
				<html>
				<head>
					<meta charset="utf-8">
					<title>Relatório de Itens de Aluguel</title>
					<style>
						body {
							font-family: Arial, sans-serif;
							font-size: 12px;
							margin: 20px;
							color: #333;
						}
						.header {
							text-align: center;
							margin-bottom: 30px;
							border-bottom: 2px solid #333;
							padding-bottom: 10px;
						}
						.header h1 {
							margin: 0;
							font-size: 18px;
						}
						.filters {
							margin-bottom: 20px;
							padding: 10px;
							background-color: #f5f5f5;
							border: 1px solid #ddd;
						}
						.product-group {
							margin-bottom: 25px;
							page-break-inside: avoid;
						}
						.product-header {
							background-color: #f0f0f0;
							padding: 8px;
							border: 1px solid #ccc;
							font-weight: bold;
							margin-bottom: 5px;
						}
						table {
							width: 100%;
							border-collapse: collapse;
							margin-bottom: 10px;
						}
						th, td {
							border: 1px solid #ddd;
							padding: 6px;
							text-align: left;
						}
						th {
							background-color: #f9f9f9;
							font-weight: bold;
						}
						.footer {
							margin-top: 30px;
							text-align: center;
							font-size: 10px;
							color: #666;
						}
						@media print {
							body { margin: 0; }
							.product-group { page-break-inside: avoid; }
						}
					</style>
				</head>
				<body>
					<div class="header">
						<h1>Mr. Fantasy - Relatório de Itens de Aluguel</h1>
						<p>Gerado em: ${currentDate}</p>
					</div>

					<div class="filters">
						<strong>Filtros Aplicados:</strong><br>
						<strong>Status:</strong> ${getStatusLabel(filters.itemStatus)}<br>
						${filters.dateFrom || filters.dateTo ? `<strong>Período:</strong> ${filters.dateFrom ? formatDate(filters.dateFrom) : '...'} até ${filters.dateTo ? formatDate(filters.dateTo) : '...'}<br>` : ''}
						${filters.productId ? `<strong>Produto:</strong> ${products.find(p => p.id.toString() === filters.productId)?.name || 'Desconhecido'}<br>` : ''}
						<strong>Total de itens:</strong> ${pagination.total}
					</div>
			`;

				reportData.forEach(productGroup => {
					html += `
						<div class="product-group">
							<div class="product-header">
								${productGroup.product.name} (SKU: ${productGroup.product.sku})
								- ${productGroup.items.length} ${productGroup.items.length === 1 ? 'item' : 'itens'}
							</div>
							<table>
								<thead>
									<tr>
										<th style="width: 12%;">Pedido</th>
										<th style="width: 25%;">Cliente</th>
										<th style="width: 15%;">Data Pedido</th>
										<th style="width: 15%;">Início</th>
										<th style="width: 15%;">Término</th>
										<th style="width: 8%;">Qtd</th>
										<th style="width: 10%;">Valor</th>
									</tr>
								</thead>
								<tbody>
					`;

					productGroup.items.forEach((item: any) => {
						html += `
							<tr>
								<td>#${item.order.orderNumber}</td>
								<td>${item.order.customer?.name || 'Sem cliente'}</td>
								<td>${formatDate(item.order.orderDate)}</td>
								<td>${item.order.rentalStartDate ? formatDate(item.order.rentalStartDate) : '-'}</td>
								<td>${item.order.rentalEndDate ? formatDate(item.order.rentalEndDate) : '-'}</td>
								<td>${item.quantity}</td>
								<td>${formatCurrency(item.totalPrice)}</td>
							</tr>
						`;
					});

					html += `
								</tbody>
							</table>
						</div>
					`;
				});

				html += `
					<div class="footer">
						<p>Mr. Fantasy - Sistema de Aluguel de Fantasias</p>
					</div>
				</body>
				</html>
			`;

				return html;
		}
</script>

<svelte:head>
	<title>Relatório de Itens de Aluguel - Mr. Fantasy</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-2xl font-semibold text-gray-900">Relatório de Itens de Aluguel</h1>
			<p class="mt-1 text-sm text-gray-500">
				Visualize e gerencie o status dos itens de aluguel agrupados por produto
			</p>
		</div>
		<div class="flex gap-2">
			<button
				on:click={() => showFilters = !showFilters}
				class="btn btn-secondary"
			>
				<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
				</svg>
				{showFilters ? 'Ocultar' : 'Mostrar'} Filtros
			</button>
			{#if reportData.length > 0}
				<button
					on:click={printReport}
					class="btn btn-primary"
					title="Imprimir relatório"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
					</svg>
					Imprimir
				</button>
			{/if}
		</div>
	</div>

	<!-- Filtros -->
	{#if showFilters}
		<div class="bg-white p-6 rounded-lg shadow border">
			<h3 class="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
				<!-- Data de -->
				<div>
					<label for="dateFrom" class="block text-sm font-medium text-gray-700 mb-1">
						Data de
					</label>
					<input
						id="dateFrom"
						type="date"
						bind:value={filters.dateFrom}
						class="form-input"
					/>
				</div>

				<!-- Data até -->
				<div>
					<label for="dateTo" class="block text-sm font-medium text-gray-700 mb-1">
						Data até
					</label>
					<input
						id="dateTo"
						type="date"
						bind:value={filters.dateTo}
						class="form-input"
					/>
				</div>

				<!-- Produto -->
				<div>
					<label for="productId" class="block text-sm font-medium text-gray-700 mb-1">
						Produto
					</label>
					<select
						id="productId"
						bind:value={filters.productId}
						class="form-input"
					>
						<option value="">Todos os produtos</option>
						{#each products as product}
							<option value={product.id.toString()}>{product.name}</option>
						{/each}
					</select>
				</div>

				<!-- Status do Item (obrigatório) -->
				<div>
					<label for="itemStatus" class="block text-sm font-medium text-gray-700 mb-1">
						Status do Item *
					</label>
					<select
						id="itemStatus"
						bind:value={filters.itemStatus}
						class="form-input"
						required
					>
						<option value="not_taken">Não Retirados</option>
						<option value="not_returned">Não Devolvidos</option>
						<option value="returned">Devolvidos</option>
					</select>
				</div>
			</div>

			<!-- Botões de ação -->
			<div class="flex gap-2 mt-4">
				<button
					on:click={applyFilters}
					class="btn btn-primary"
					disabled={loading}
				>
					{#if loading}
						<svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Carregando...
					{:else}
						Aplicar Filtros
					{/if}
				</button>
				<button
					on:click={resetFilters}
					class="btn btn-secondary"
					disabled={loading}
				>
					Limpar Filtros
				</button>
			</div>
		</div>
	{/if}

	<!-- Status atual dos filtros -->
	<div class="bg-blue-50 p-4 rounded-lg">
		<h4 class="text-sm font-medium text-blue-900 mb-2">Filtros Ativos:</h4>
		<div class="text-sm text-blue-700">
			<span class="font-medium">Status:</span> {getStatusLabel(filters.itemStatus)}
			{#if filters.dateFrom || filters.dateTo}
				<span class="ml-4"><span class="font-medium">Período:</span> 
					{filters.dateFrom ? formatDate(filters.dateFrom) : '...'} até {filters.dateTo ? formatDate(filters.dateTo) : '...'}
				</span>
			{/if}
			{#if filters.productId}
				<span class="ml-4"><span class="font-medium">Produto:</span> 
					{products.find(p => p.id.toString() === filters.productId)?.name || 'Desconhecido'}
				</span>
			{/if}
		</div>
	</div>

	<!-- Resultados -->
	{#if loading}
		<div class="text-center py-12">
			<svg class="animate-spin mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
			<p class="mt-4 text-gray-500">Carregando relatório...</p>
		</div>
	{:else if reportData.length === 0}
		<div class="text-center py-12">
			<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
			</svg>
			<h3 class="mt-4 text-lg font-medium text-gray-900">Nenhum resultado encontrado</h3>
			<p class="mt-2 text-gray-500">Tente ajustar os filtros para ver dados.</p>
		</div>
	{:else}
		<!-- Tabela de resultados -->
		<div class="bg-white shadow rounded-lg overflow-hidden">
			<div class="px-6 py-4 border-b border-gray-200">
				<h3 class="text-lg font-medium text-gray-900">
					Itens de Aluguel ({pagination.total} {pagination.total === 1 ? 'item' : 'itens'})
				</h3>
			</div>

			{#each reportData as productGroup}
				<div class="border-b border-gray-200 last:border-b-0">
					<!-- Cabeçalho do produto -->
					<div class="bg-gray-50 px-6 py-3">
						<h4 class="text-base font-medium text-gray-900">{productGroup.product.name}</h4>
						<p class="text-sm text-gray-500">SKU: {productGroup.product.sku} • {productGroup.items.length} {productGroup.items.length === 1 ? 'item' : 'itens'}</p>
					</div>

					<!-- Lista de itens -->
					<div class="divide-y divide-gray-100">
						{#each productGroup.items as item}
							<div class="px-6 py-4 hover:bg-gray-50">
								<div class="flex items-center justify-between">
									<div class="flex-1 min-w-0">
										<div class="flex items-center space-x-4">
											<div class="flex-1">
												<p class="text-sm font-medium text-gray-900">
													Pedido #{item.order.orderNumber}
												</p>
												<p class="text-xs text-gray-500">
													{#if item.order.customer}
														Cliente: {item.order.customer.name}
													{:else}
														Sem cliente
													{/if}
												</p>
											</div>
											<div class="text-right">
												<p class="text-sm text-gray-900">
													Data do Pedido: {formatDate(item.order.orderDate)}
												</p>
												{#if item.order.rentalStartDate}
													<p class="text-xs text-gray-500">
														Início: {formatDate(item.order.rentalStartDate)}
													</p>
												{/if}
												{#if item.order.rentalEndDate}
													<p class="text-xs text-gray-500">
														Término: {formatDate(item.order.rentalEndDate)}
													</p>
												{/if}
											</div>
											<div class="text-right">
												<p class="text-sm font-medium text-gray-900">
													Qtd: {item.quantity}
												</p>
												<p class="text-xs text-gray-500">
													{formatCurrency(item.totalPrice)}
												</p>
											</div>
											<div>
												<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(item.itemTaken, item.itemReturned)}">
													{getItemStatusText(item.itemTaken, item.itemReturned)}
												</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<!-- Paginação -->
		{#if pagination.totalPages > 1}
			<div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
				<div class="flex-1 flex justify-between sm:hidden">
					<button
						on:click={() => changePage(pagination.page - 1)}
						disabled={!pagination.hasPrev}
						class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Anterior
					</button>
					<button
						on:click={() => changePage(pagination.page + 1)}
						disabled={!pagination.hasNext}
						class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Próxima
					</button>
				</div>
				<div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
					<div>
						<p class="text-sm text-gray-700">
							Mostrando
							<span class="font-medium">{Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}</span>
							até
							<span class="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span>
							de
							<span class="font-medium">{pagination.total}</span>
							resultados
						</p>
					</div>
					<div>
						<nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
							<button
								on:click={() => changePage(pagination.page - 1)}
								disabled={!pagination.hasPrev}
								class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<span class="sr-only">Anterior</span>
								<svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
									<path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
								</svg>
							</button>
							
							{#each Array(Math.min(pagination.totalPages, 7)) as _, i}
								{@const pageNumber = i + 1}
								<button
									on:click={() => changePage(pageNumber)}
									class="relative inline-flex items-center px-4 py-2 border text-sm font-medium {pageNumber === pagination.page ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}"
								>
									{pageNumber}
								</button>
							{/each}

							<button
								on:click={() => changePage(pagination.page + 1)}
								disabled={!pagination.hasNext}
								class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<span class="sr-only">Próxima</span>
								<svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
									<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
								</svg>
							</button>
						</nav>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.form-input {
		@apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm;
	}

	.btn {
		@apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors;
	}

	.btn-primary {
		@apply text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500;
	}

	.btn-secondary {
		@apply text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:ring-blue-500;
	}
</style>