<script lang="ts">
	import { onMount } from 'svelte';
	import { orderReportStore, orderReportActions } from '$lib/stores/orderReport.js';
	import { notificationStore } from '$lib/stores/notifications.js';
	import { products } from '$lib/stores/products.js';
	import { customers } from '$lib/stores/customers.js';

	// Estado das abas
	let activeTab: 'orders' | 'rental' = 'orders';

	// Estados do relatório de pedidos
	let orderReportState: any;
	let customersList: any[] = [];
	let attendants: any[] = [];
	
	// Variáveis locais para filtros de pedidos
	let orderDateFrom = '';
	let orderDateTo = '';
	let orderCustomerId = '';
	let orderAttendantId = '';
	let customerSearch = '';
	let showCustomerDropdown = false;
	let customerSelectedIndex = -1;
	let customerDropdownRef: HTMLElement;
	let searchingCustomers = false;

	// Estados do relatório de itens de aluguel
	let rentalLoading = false;
	let rentalReportData: any[] = [];
	let rentalPagination = {
		page: 1,
		limit: 50,
		total: 0,
		totalPages: 0,
		hasNext: false,
		hasPrev: false
	};
	let rentalFilters = {
		dateFrom: '',
		dateTo: '',
		productId: '',
		itemStatus: 'not_taken'
	};
	let rentalShowFilters = true;
	let productsData: any;
	let productsList: any[] = [];
	let searchingProducts = false;
	let productSearch = '';
	let showProductDropdown = false;
	let productSelectedIndex = -1;
	let productDropdownRef: HTMLElement;

	// Subscrever ao store de relatórios de pedidos
	orderReportStore.subscribe(state => {
		orderReportState = state;
		// Sincronizar filtros locais com o store
		if (state?.filters) {
			orderDateFrom = state.filters.dateFrom || '';
			orderDateTo = state.filters.dateTo || '';
			orderCustomerId = state.filters.customerId || '';
			orderAttendantId = state.filters.attendantId || '';
		}
	});

	onMount(async () => {
		await loadCustomers();
		await loadAttendants();
		await loadProducts();
		
		// Inicializar filtros de data com a data atual
		const today = new Date();
		const todayString = today.toISOString().split('T')[0];
		orderDateFrom = todayString;
		orderDateTo = todayString;
		orderReportActions.setFilters({ dateFrom: orderDateFrom, dateTo: orderDateTo });
		
		if (activeTab === 'orders') {
			await orderReportActions.loadReport();
		} else {
			await loadRentalReport();
		}
		
		// Add global click listener to close dropdowns when clicking outside
		function handleClickOutside(event: MouseEvent) {
			const target = event.target as Element;
			
			// Check if clicked element is inside product dropdown or its trigger
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
		
		// Cleanup function with proper typing
		return (() => {
			document.removeEventListener('click', handleClickOutside, true);
			document.removeEventListener('keydown', handleKeydown, true);
		}) as unknown as void;
	});

	// Função para trocar abas e limpar estados
	function switchTab(tab: 'orders' | 'rental') {
		activeTab = tab;
		
		// Limpar estados da aba anterior
		if (tab === 'orders') {
			// Limpar estados do rental
			rentalReportData = [];
			rentalPagination = {
				page: 1,
				limit: 50,
				total: 0,
				totalPages: 0,
				hasNext: false,
				hasPrev: false
			};
			orderReportActions.loadReport();
		} else {
			// Limpar estados dos pedidos
			orderReportActions.clearFilters();
			loadRentalReport();
		}
	}

	// Funções do relatório de pedidos
	async function loadCustomers() {
		try {
			const response = await fetch('/api/customers?limit=1000&active=true');
			if (response.ok) {
				const data = await response.json();
				customersList = data.customers || [];
			}
		} catch (error) {
			console.error('Erro ao carregar clientes:', error);
		}
	}

	async function loadAttendants() {
		try {
			const response = await fetch('/api/attendants?active=true');
			if (response.ok) {
				const data = await response.json();
				attendants = data.attendants || [];
			}
		} catch (error) {
			console.error('Erro ao carregar atendentes:', error);
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
		const customersData = $customers;
		customersList = customersData.customers || [];
		searchingCustomers = false;
		showCustomerDropdown = true;
		customerSelectedIndex = -1;
	}
	
	function selectCustomer(customer: any) {
		orderCustomerId = customer.id.toString();
		customerSearch = customer.name;
		showCustomerDropdown = false;
		customerSelectedIndex = -1;
		orderReportActions.setFilters({ customerId: orderCustomerId });
	}
	
	function clearCustomerSelection() {
		orderCustomerId = '';
		customerSearch = '';
		showCustomerDropdown = false;
		customerSelectedIndex = -1;
		orderReportActions.setFilters({ customerId: '' });
	}

	// Funções para atualizar os filtros de data
	function updateDateFrom() {
		orderReportActions.setFilters({ dateFrom: orderDateFrom });
	}

	function updateDateTo() {
		orderReportActions.setFilters({ dateTo: orderDateTo });
	}

	function applyOrderFilters() {
		orderReportActions.setPage(1);
		orderReportActions.loadReport();
	}

	function resetOrderFilters() {
		// Limpar variáveis locais
		const today = new Date();
		const todayString = today.toISOString().split('T')[0];
		orderDateFrom = todayString;
		orderDateTo = todayString;
		orderCustomerId = '';
		orderAttendantId = '';
		customerSearch = '';
		
		orderReportActions.setFilters({ 
			dateFrom: orderDateFrom, 
			dateTo: orderDateTo,
			customerId: '',
			attendantId: ''
		});
		orderReportActions.loadReport();
	}

	function changeOrderPage(page: number) {
		orderReportActions.setPage(page);
		orderReportActions.loadReport();
	}

	// Funções do relatório de itens de aluguel
	async function loadProducts() {
		try {
			const response = await fetch('/api/products?limit=1000&active=true');
			if (response.ok) {
				const data = await response.json();
				productsList = data.products || [];
			}
		} catch (error) {
			console.error('Erro ao carregar produtos:', error);
		}
	}

	async function searchProducts() {
		if (productSearch.length < 2) {
			showProductDropdown = false;
			productSelectedIndex = -1;
			return;
		}
		
		searchingProducts = true;
		await products.fetchProducts({ search: productSearch, limit: 20 });
		productsData = $products;
		productsList = productsData.products;
		searchingProducts = false;
		showProductDropdown = true;
		productSelectedIndex = -1;
	}
	
	function selectProduct(product: any) {
		rentalFilters.productId = product.id.toString();
		productSearch = product.name;
		showProductDropdown = false;
		productSelectedIndex = -1;
	}
	
	function clearProductSelection() {
		rentalFilters.productId = '';
		productSearch = '';
		showProductDropdown = false;
		productSelectedIndex = -1;
	}

	async function loadRentalReport() {
		rentalLoading = true;
		try {
			const searchParams = new URLSearchParams();
			
			if (rentalFilters.dateFrom) searchParams.set('dateFrom', rentalFilters.dateFrom);
			if (rentalFilters.dateTo) searchParams.set('dateTo', rentalFilters.dateTo);
			if (rentalFilters.productId) searchParams.set('productId', rentalFilters.productId);
			searchParams.set('itemStatus', rentalFilters.itemStatus);
			searchParams.set('page', rentalPagination.page.toString());
			searchParams.set('limit', rentalPagination.limit.toString());

			const response = await fetch(`/api/orders/rental-report?${searchParams}`);
			
			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					rentalReportData = result.data;
					rentalPagination = result.pagination;
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
			rentalLoading = false;
		}
	}

	function applyRentalFilters() {
		rentalPagination.page = 1;
		loadRentalReport();
	}

	function resetRentalFilters() {
		rentalFilters = {
			dateFrom: '',
			dateTo: '',
			productId: '',
			itemStatus: 'not_taken'
		};
		productSearch = '';
		rentalPagination.page = 1;
		loadRentalReport();
	}

	function changeRentalPage(page: number) {
		rentalPagination.page = page;
		loadRentalReport();
	}

	// Funções de utilidade
	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('pt-BR');
	}

	function formatCurrency(value: number) {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL'
		}).format(value);
	}

	function getOrderStatusLabel(status: string) {
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

	function getRentalStatusLabel(status: string) {
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

	function getRentalStatusColor(itemTaken: boolean, itemReturned: boolean) {
		if (!itemTaken) return 'bg-yellow-100 text-yellow-800';
		if (!itemReturned) return 'bg-blue-100 text-blue-800';
		return 'bg-green-100 text-green-800';
	}

	function getRentalItemStatusText(itemTaken: boolean, itemReturned: boolean) {
		if (!itemTaken) return 'Não Retirado';
		if (!itemReturned) return 'Não Devolvido';
		return 'Devolvido';
	}

	// Funções de impressão
	function printOrderReport() {
		if (!orderReportState?.data?.length) {
			notificationStore.warning('Nenhum dado para imprimir');
			return;
		}

		// Calcular totais por forma de pagamento
		const paymentTotals: { [key: string]: number } = {};
		orderReportState.data.forEach((order: any) => {
			// Verificar se há orderPayments (não payments)
			if (order.orderPayments && order.orderPayments.length > 0) {
				order.orderPayments.forEach((payment: any) => {
					const method = payment.paymentMethod?.name || 'Não informado';
					paymentTotals[method] = (paymentTotals[method] || 0) + (payment.amount || 0);
				});
			} else {
				// Se não tem pagamentos, considerar como não informado
				paymentTotals['Não informado'] = (paymentTotals['Não informado'] || 0) + (order.totalAmount || 0);
			}
		});

		const printWindow = window.open('', '_blank', 'width=1000,height=800');
		if (printWindow) {
			const printContent = `
				<!DOCTYPE html>
				<html>
				<head>
					<title>Relatório de Pedidos - Mr. Fantasy</title>
					<style>
						body { font-family: Arial, sans-serif; margin: 15px; font-size: 12px; }
						.header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 8px; }
						.header h1 { font-size: 16px; margin: 0 0 5px 0; }
						.header p { margin: 2px 0; font-size: 10px; }
						.summary { margin-bottom: 15px; }
						.summary h3 { font-size: 13px; margin: 0 0 5px 0; }
						.summary-item { display: inline-block; margin-right: 15px; font-size: 10px; }
						.order { margin-bottom: 15px; border: 1px solid #ccc; padding: 8px; }
						.order-header { background-color: #f8f8f8; padding: 6px; margin: -8px -8px 8px -8px; }
						.order-header h4 { font-size: 12px; margin: 0 0 3px 0; }
						.order-header p { margin: 0; font-size: 10px; }
						.order h5 { font-size: 11px; margin: 8px 0 3px 0; }
						.items-table { width: 100%; border-collapse: collapse; margin: 5px 0; }
						.items-table th, .items-table td { border: 1px solid #ddd; padding: 3px; text-align: left; font-size: 9px; }
						.items-table th { background-color: #f2f2f2; font-weight: bold; }
						.payment-summary { margin-top: 15px; border-top: 1px solid #333; padding-top: 10px; }
						.payment-table { width: 40%; border-collapse: collapse; }
						.payment-table th, .payment-table td { border: 1px solid #ddd; padding: 4px; font-size: 10px; }
						.order-total { font-weight: bold; margin-top: 5px; font-size: 10px; }
					</style>
				</head>
				<body>
					<div class="header">
						<h1>Relatório de Pedidos</h1>
						<p>Mr. Fantasy - Sistema de Aluguel de Fantasias</p>
						<p>Data de geração: ${new Date().toLocaleString('pt-BR')}</p>
					</div>

					${orderReportState.summary ? `
					<div class="summary">
						<h3>Resumo</h3>
						<div class="summary-item"><strong>Pedidos:</strong> ${orderReportState.summary.totalOrders}</div>
						<div class="summary-item"><strong>Itens:</strong> ${orderReportState.summary.totalItems}</div>
						<div class="summary-item"><strong>Total:</strong> ${formatCurrency(orderReportState.summary.totalAmount)}</div>
					</div>
					` : ''}

					<h3 style="font-size: 13px; margin: 10px 0;">Detalhes dos Pedidos</h3>
					${orderReportState.data.map((order: any) => `
						<div class="order">
							<div class="order-header">
								<h4>Pedido #${order.orderNumber}</h4>
								<p><strong>Data:</strong> ${formatDate(order.orderDate)} | <strong>Cliente:</strong> ${order.customer?.name || 'Sem cliente'} | <strong>Status:</strong> ${getOrderStatusLabel(order.status)}</p>
							</div>

							${order.orderItems && order.orderItems.length > 0 ? `
							<h5>Itens</h5>
							<table class="items-table">
								<tr><th>Produto</th><th>Tipo</th><th>Qtd</th><th>Unit.</th><th>Desc.</th><th>Total</th></tr>
								${order.orderItems.map((item: any) => `
									<tr>
										<td>${item.product?.name || 'N/A'}</td>
										<td>${item.itemType === 'RENTAL' ? 'Aluguel' : 'Venda'}</td>
										<td style="text-align: center;">${item.quantity}</td>
										<td style="text-align: right;">${formatCurrency(item.unitPrice || 0)}</td>
										<td style="text-align: right;">${item.discountValue > 0 ? (item.discountType === 'PERCENTAGE' ? item.discountValue + '%' : formatCurrency(item.discountValue)) : '-'}</td>
										<td style="text-align: right;">${formatCurrency(item.totalPrice || 0)}</td>
									</tr>
								`).join('')}
							</table>
							` : '<p style="font-size: 10px;">Sem itens</p>'}

							${order.orderPayments && order.orderPayments.length > 0 ? `
							<h5>Pagamentos</h5>
							<table class="items-table">
								<tr><th>Método</th><th>Valor</th></tr>
								${order.orderPayments.map((payment: any) => `
									<tr>
										<td>${payment.paymentMethod?.name || 'N/A'}</td>
										<td>${formatCurrency(payment.amount || 0)}</td>
									</tr>
								`).join('')}
							</table>
							` : '<p style="font-size: 10px;">Sem pagamentos</p>'}

							<p class="order-total"><strong>Total:</strong> ${formatCurrency(order.totalAmount || 0)}</p>
						</div>
					`).join('')}

					<div class="payment-summary">
						<h3>Resumo por Forma de Pagamento</h3>
						<table class="payment-table">
							<tr><th>Método</th><th>Total</th></tr>
							${Object.entries(paymentTotals).map(([method, total]) => `
								<tr><td>${method}</td><td style="text-align: right;">${formatCurrency(total)}</td></tr>
							`).join('')}
							<tr style="font-weight: bold; border-top: 1px solid #333;">
								<td>TOTAL GERAL</td><td style="text-align: right;">${formatCurrency(Object.values(paymentTotals).reduce((sum, value) => sum + value, 0))}</td>
							</tr>
						</table>
					</div>
				</body>
				</html>
			`;
			printWindow.document.write(printContent);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				printWindow.print();
				printWindow.close();
			}, 100);
		}
	}

	function printRentalReport() {
		if (!rentalReportData?.length) {
			notificationStore.warning('Nenhum dado para imprimir');
			return;
		}

		const printWindow = window.open('', '_blank', 'width=1000,height=800');
		if (printWindow) {
			const printContent = `
				<!DOCTYPE html>
				<html>
				<head>
					<title>Relatório de Itens de Aluguel - Mr. Fantasy</title>
					<style>
						body { font-family: Arial, sans-serif; margin: 15px; font-size: 11px; }
						.header { text-align: center; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 5px; }
						.header h1 { font-size: 16px; margin: 0 0 3px 0; }
						.header p { margin: 1px 0; font-size: 10px; }
						.filters-info { background-color: #f8f8f8; padding: 8px; margin-bottom: 10px; border-radius: 3px; }
						.filters-info h3 { font-size: 12px; margin: 0 0 5px 0; }
						.filters-info p { margin: 2px 0; font-size: 10px; }
						.product-group { margin-bottom: 15px; border: 1px solid #ccc; }
						.product-header { background-color: #f5f5f5; padding: 5px; border-bottom: 1px solid #ccc; }
						.product-header h3 { font-size: 12px; margin: 0 0 2px 0; }
						.product-header p { margin: 0; font-size: 9px; }
						.items-table { width: 100%; border-collapse: collapse; }
						.items-table th, .items-table td { border: 1px solid #ddd; padding: 3px; text-align: left; font-size: 9px; }
						.items-table th { background-color: #f2f2f2; font-weight: bold; }
						.status-not-taken { background-color: #fef3c7; color: #92400e; }
						.status-not-returned { background-color: #dbeafe; color: #1e40af; }
						.status-returned { background-color: #d1fae5; color: #065f46; }
					</style>
				</head>
				<body>
					<div class="header">
						<h1>Relatório de Itens de Aluguel</h1>
						<p>Mr. Fantasy - Sistema de Aluguel de Fantasias</p>
						<p>Data: ${new Date().toLocaleString('pt-BR')}</p>
					</div>

					<div class="filters-info">
						<h3>Filtros Aplicados</h3>
						<p><strong>Status:</strong> ${getRentalStatusLabel(rentalFilters.itemStatus)}</p>
						${rentalFilters.dateFrom || rentalFilters.dateTo ? `
						<p><strong>Período:</strong> ${rentalFilters.dateFrom ? formatDate(rentalFilters.dateFrom) : '...'} até ${rentalFilters.dateTo ? formatDate(rentalFilters.dateTo) : '...'}</p>
						` : ''}
						${rentalFilters.productId ? `
						<p><strong>Produto:</strong> ${productSearch || 'Desconhecido'}</p>
						` : ''}
						<p><strong>Total:</strong> ${rentalPagination.total} itens</p>
					</div>

					${rentalReportData.map((productGroup: any) => `
						<div class="product-group">
							<div class="product-header">
								<h3>${productGroup.product.name}</h3>
								<p>SKU: ${productGroup.product.sku} • ${productGroup.items.length} ${productGroup.items.length === 1 ? 'item' : 'itens'}</p>
							</div>
							<table class="items-table">
								<tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Qtd</th><th>Valor</th><th>Status</th></tr>
								${productGroup.items.map((item: any) => `
									<tr>
										<td>#${item.order.orderNumber}</td>
										<td>${item.order.customer?.name || 'Sem cliente'}</td>
										<td>${formatDate(item.order.orderDate)}</td>
										<td>${item.quantity}</td>
										<td>${formatCurrency(item.totalPrice)}</td>
										<td class="${getRentalStatusColor(item.itemTaken, item.itemReturned).replace('bg-', 'status-').replace('-100', '').replace(' text-', ' status-')}">
											${getRentalItemStatusText(item.itemTaken, item.itemReturned)}
										</td>
									</tr>
								`).join('')}
							</table>
						</div>
					`).join('')}
				</body>
				</html>
			`;
			printWindow.document.write(printContent);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				printWindow.print();
			}, 500);
		}
	}
</script>

<svelte:head>
	<title>Relatórios - Mr. Fantasy</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header com abas -->
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-2xl font-semibold text-gray-900">Relatórios</h1>
			<p class="mt-1 text-sm text-gray-500">
				Visualize e analise dados de pedidos e itens de aluguel
			</p>
		</div>
	</div>

	<!-- Sistema de abas -->
	<div class="border-b border-gray-200">
		<nav class="-mb-px flex space-x-8">
			<button
				on:click={() => switchTab('orders')}
				class="{activeTab === 'orders' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
			>
				Relatório de Pedidos
			</button>
			<button
				on:click={() => switchTab('rental')}
				class="{activeTab === 'rental' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
			>
				Relatório de Itens de Aluguel
			</button>
		</nav>
	</div>

	<!-- Conteúdo das abas -->
	{#if activeTab === 'orders'}
		<!-- Aba Relatório de Pedidos -->
		<div class="space-y-6">
			<!-- Header da aba -->
			<div class="flex justify-between items-center">
				<div>
					<h2 class="text-lg font-medium text-gray-900">Relatório de Pedidos</h2>
					<p class="mt-1 text-sm text-gray-500">
						Visualização detalhada dos pedidos com filtros avançados
					</p>
				</div>
				<div class="flex gap-2">
					{#if orderReportState?.data?.length > 0}
						<button
							on:click={printOrderReport}
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
			<div class="bg-white p-6 rounded-lg shadow border">
				<h3 class="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
				<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
					<!-- Data de -->
					<div>
						<label for="orderDateFrom" class="block text-sm font-medium text-gray-700 mb-1">
							Data de
						</label>
						<input
							id="orderDateFrom"
							type="date"
							bind:value={orderDateFrom}
							on:change={updateDateFrom}
							class="form-input"
						/>
					</div>

					<!-- Data até -->
					<div>
						<label for="orderDateTo" class="block text-sm font-medium text-gray-700 mb-1">
							Data até
						</label>
						<input
							id="orderDateTo"
							type="date"
							bind:value={orderDateTo}
							on:change={updateDateTo}
							class="form-input"
						/>
					</div>

					<!-- Cliente -->
					<div class="relative" bind:this={customerDropdownRef}>
						<label for="orderCustomerId" class="block text-sm font-medium text-gray-700 mb-1">
							Cliente
						</label>
						<div class="relative">
							<input
								id="orderCustomerId"
								type="text"
								bind:value={customerSearch}
								on:input={searchCustomers}
								on:focus={searchCustomers}
								placeholder="Digite para buscar clientes..."
								class="form-input pr-10"
								autocomplete="off"
							/>
							{#if orderCustomerId}
								<!-- svelte-ignore a11y_consider_explicit_label -->
								<button
									type="button"
									on:click={clearCustomerSelection}
									class="absolute inset-y-0 right-0 pr-3 flex items-center"
									title="Limpar seleção"
								>
									<svg class="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							{/if}
						</div>
						
						<!-- Dropdown de clientes -->
						{#if showCustomerDropdown}
							<div class="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm" style="max-height: 200px;">
								{#if searchingCustomers}
									<div class="px-4 py-2 text-gray-500">
										Buscando...
									</div>
								{:else if customersList.length === 0}
									<div class="px-4 py-2 text-gray-500">
										Nenhum cliente encontrado
									</div>
								{:else}
									{#each customersList as customer, i}
										<button
											type="button"
											on:click={() => selectCustomer(customer)}
											class="block w-full text-left px-4 py-2 text-sm {i === customerSelectedIndex ? 'bg-blue-100 text-blue-900' : 'text-gray-700 hover:bg-gray-100'}"
										>
											<div class="font-medium">{customer.name}</div>
											<div class="text-xs text-gray-500">{customer.email || customer.phone || 'Sem contato'}</div>
										</button>
									{/each}
								{/if}
							</div>
						{/if}
					</div>

					<!-- Atendente -->
					<div>
						<label for="orderAttendantId" class="block text-sm font-medium text-gray-700 mb-1">
							Atendente
						</label>
						<select
							id="orderAttendantId"
							bind:value={orderAttendantId}
							on:change={() => orderReportActions.setFilters({ attendantId: orderAttendantId })}
							class="form-input"
						>
							<option value="">Todos os atendentes</option>
							{#each attendants as attendant}
								<option value={attendant.id.toString()}>{attendant.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Botões de ação -->
				<div class="flex gap-2 mt-4">
					<button
						on:click={applyOrderFilters}
						class="btn btn-primary"
						disabled={orderReportState?.loading}
					>
						{#if orderReportState?.loading}
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
						on:click={resetOrderFilters}
						class="btn btn-secondary"
						disabled={orderReportState?.loading}
					>
						Limpar Filtros
					</button>
				</div>
			</div>

			<!-- Resumo -->
			{#if orderReportState?.summary}
				<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div class="bg-white overflow-hidden shadow rounded-lg">
						<div class="p-5">
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									</svg>
								</div>
								<div class="ml-5 w-0 flex-1">
									<dl>
										<dt class="text-sm font-medium text-gray-500 truncate">Total de Pedidos</dt>
										<dd class="text-lg font-medium text-gray-900">{orderReportState.summary.totalOrders}</dd>
									</dl>
								</div>
							</div>
						</div>
					</div>

					<div class="bg-white overflow-hidden shadow rounded-lg">
						<div class="p-5">
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<svg class="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
									</svg>
								</div>
								<div class="ml-5 w-0 flex-1">
									<dl>
										<dt class="text-sm font-medium text-gray-500 truncate">Valor Total</dt>
										<dd class="text-lg font-medium text-gray-900">{formatCurrency(orderReportState.summary.totalAmount)}</dd>
									</dl>
								</div>
							</div>
						</div>
					</div>

					<div class="bg-white overflow-hidden shadow rounded-lg">
						<div class="p-5">
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<svg class="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
									</svg>
								</div>
								<div class="ml-5 w-0 flex-1">
									<dl>
										<dt class="text-sm font-medium text-gray-500 truncate">Total de Itens</dt>
										<dd class="text-lg font-medium text-gray-900">{orderReportState.summary.totalItems}</dd>
									</dl>
								</div>
							</div>
						</div>
					</div>

					<div class="bg-white overflow-hidden shadow rounded-lg">
						<div class="p-5">
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								</div>
								<div class="ml-5 w-0 flex-1">
									<dl>
										<dt class="text-sm font-medium text-gray-500 truncate">Total Desconto</dt>
										<dd class="text-lg font-medium text-gray-900">{formatCurrency(orderReportState.summary.totalDiscount)}</dd>
									</dl>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Lista de pedidos -->
			{#if orderReportState?.loading}
				<div class="text-center py-12">
					<svg class="animate-spin mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					<p class="mt-4 text-gray-500">Carregando relatório...</p>
				</div>
			{:else if !orderReportState?.data?.length}
				<div class="text-center py-12">
					<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<h3 class="mt-4 text-lg font-medium text-gray-900">Nenhum resultado encontrado</h3>
					<p class="mt-2 text-gray-500">Tente ajustar os filtros para ver dados.</p>
				</div>
			{:else}
				<div class="bg-white shadow rounded-lg overflow-hidden">
					<div class="overflow-x-auto">
						<table class="min-w-full divide-y divide-gray-200">
							<thead class="bg-gray-50">
								<tr>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Atendente</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Itens</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
								</tr>
							</thead>
							<tbody class="bg-white divide-y divide-gray-200">
								{#each orderReportState.data as order}
									<tr class="hover:bg-gray-50">
										<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
											#{order.orderNumber}
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{formatDate(order.orderDate)}
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{order.customer?.name || 'Sem cliente'}
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{order.attendant?.name || '-'}
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{order.status}
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{order.totalQuantity}
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
											{formatCurrency(order.totalAmount)}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Aba Relatório de Itens de Aluguel -->
		<div class="space-y-6">
			<!-- Header da aba -->
			<div class="flex justify-between items-center">
				<div>
					<h2 class="text-lg font-medium text-gray-900">Relatório de Itens de Aluguel</h2>
					<p class="mt-1 text-sm text-gray-500">
						Visualize e gerencie o status dos itens de aluguel agrupados por produto
					</p>
				</div>
				<div class="flex gap-2">
					<button
						on:click={() => rentalShowFilters = !rentalShowFilters}
						class="btn btn-secondary"
					>
						<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
						</svg>
						{rentalShowFilters ? 'Ocultar' : 'Mostrar'} Filtros
					</button>
					{#if rentalReportData.length > 0}
						<button
							on:click={printRentalReport}
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
			{#if rentalShowFilters}
				<div class="bg-white p-6 rounded-lg shadow border">
					<h3 class="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
					<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
						<!-- Data de -->
						<div>
							<label for="rentalDateFrom" class="block text-sm font-medium text-gray-700 mb-1">
								Data de
							</label>
							<input
								id="rentalDateFrom"
								type="date"
								bind:value={rentalFilters.dateFrom}
								class="form-input"
							/>
						</div>

						<!-- Data até -->
						<div>
							<label for="rentalDateTo" class="block text-sm font-medium text-gray-700 mb-1">
								Data até
							</label>
							<input
								id="rentalDateTo"
								type="date"
								bind:value={rentalFilters.dateTo}
								class="form-input"
							/>
						</div>

						<!-- Produto -->
						<div class="relative">
							<label for="rentalProductId" class="block text-sm font-medium text-gray-700 mb-1">
								Produto
							</label>
							<div class="relative">
								<input
									id="rentalProductId"
									type="text"
									bind:value={productSearch}
									on:input={searchProducts}
									on:focus={searchProducts}
									placeholder="Digite para buscar produtos..."
									class="form-input pr-10"
									autocomplete="off"
								/>
								{#if rentalFilters.productId}
									<!-- svelte-ignore a11y_consider_explicit_label -->
									<button
										type="button"
										on:click={clearProductSelection}
										class="absolute inset-y-0 right-0 pr-3 flex items-center"
										title="Limpar seleção"
									>
										<svg class="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								{/if}
							</div>
							
							<!-- Dropdown de produtos -->
							{#if showProductDropdown}
								<div 
									bind:this={productDropdownRef}
									class="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
									style="max-height: 200px;"
								>
									{#if searchingProducts}
										<div class="px-4 py-2 text-gray-500">
											Buscando...
										</div>
									{:else if productsList.length === 0}
										<div class="px-4 py-2 text-gray-500">
											Nenhum produto encontrado
										</div>
									{:else}
										{#each productsList as product, i}
											<button
												type="button"
												on:click={() => selectProduct(product)}
												class="block w-full text-left px-4 py-2 text-sm {i === productSelectedIndex ? 'bg-blue-100 text-blue-900' : 'text-gray-700 hover:bg-gray-100'}"
											>
												<div class="font-medium">{product.name}</div>
												<div class="text-xs text-gray-500">SKU: {product.sku} • Estoque: {product.stockQuantity}</div>
											</button>
										{/each}
									{/if}
								</div>
							{/if}
						</div>

						<!-- Status do Item -->
						<div>
							<label for="rentalItemStatus" class="block text-sm font-medium text-gray-700 mb-1">
								Status do Item *
							</label>
							<select
								id="rentalItemStatus"
								bind:value={rentalFilters.itemStatus}
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
							on:click={applyRentalFilters}
							class="btn btn-primary"
							disabled={rentalLoading}
						>
							{#if rentalLoading}
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
							on:click={resetRentalFilters}
							class="btn btn-secondary"
							disabled={rentalLoading}
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
					<span class="font-medium">Status:</span> {getRentalStatusLabel(rentalFilters.itemStatus)}
					{#if rentalFilters.dateFrom || rentalFilters.dateTo}
						<span class="ml-4"><span class="font-medium">Período:</span> 
							{rentalFilters.dateFrom ? formatDate(rentalFilters.dateFrom) : '...'} até {rentalFilters.dateTo ? formatDate(rentalFilters.dateTo) : '...'}
						</span>
					{/if}
					{#if rentalFilters.productId}
						<span class="ml-4"><span class="font-medium">Produto:</span> 
							{productSearch || 'Desconhecido'}
						</span>
					{/if}
				</div>
			</div>

			<!-- Resultados -->
			{#if rentalLoading}
				<div class="text-center py-12">
					<svg class="animate-spin mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					<p class="mt-4 text-gray-500">Carregando relatório...</p>
				</div>
			{:else if rentalReportData.length === 0}
				<div class="text-center py-12">
					<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<h3 class="mt-4 text-lg font-medium text-gray-900">Nenhum resultado encontrado</h3>
					<p class="mt-2 text-gray-500">Tente ajustar os filtros para ver dados.</p>
				</div>
			{:else}
				<!-- Tabela de resultados agrupados por produto -->
				<div class="bg-white shadow rounded-lg overflow-hidden">
					<div class="px-6 py-4 border-b border-gray-200">
						<h3 class="text-lg font-medium text-gray-900">
							Itens de Aluguel ({rentalPagination.total} {rentalPagination.total === 1 ? 'item' : 'itens'})
						</h3>
					</div>

					{#each rentalReportData as productGroup}
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
															Data: {formatDate(item.order.orderDate)}
														</p>
														<p class="text-xs text-gray-500">
															Qtd: {item.quantity} • {formatCurrency(item.totalPrice)}
														</p>
													</div>
													<div>
														<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getRentalStatusColor(item.itemTaken, item.itemReturned)}">
															{getRentalItemStatusText(item.itemTaken, item.itemReturned)}
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
			{/if}
		</div>
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