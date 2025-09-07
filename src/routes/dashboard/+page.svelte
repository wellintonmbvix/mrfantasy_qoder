<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
	
	// Reactive declarations
	let stats: any;
	let recentOrders: any;
	let lowStockProducts: any;
	
	$: {
		stats = data.stats;
		recentOrders = data.recentOrders;
		lowStockProducts = data.lowStockProducts;
	}
</script>

<svelte:head>
	<title>Dashboard - Mr. Fantasy</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-semibold text-gray-900">Dashboard</h1>
		<p class="mt-1 text-sm text-gray-500">
			Visão geral do sistema de aluguel de fantasias
		</p>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
		<div class="card">
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<div class="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
						<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
						</svg>
					</div>
				</div>
				<div class="ml-5 w-0 flex-1">
					<dl>
						<dt class="text-sm font-medium text-gray-500 truncate">Total de Clientes</dt>
						<dd class="text-lg font-medium text-gray-900">{stats?.totalCustomers || 0}</dd>
					</dl>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<div class="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
						<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 21h6" />
						</svg>
					</div>
				</div>
				<div class="ml-5 w-0 flex-1">
					<dl>
						<dt class="text-sm font-medium text-gray-500 truncate">Total de Produtos</dt>
						<dd class="text-lg font-medium text-gray-900">{stats?.totalProducts || 0}</dd>
					</dl>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<div class="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
						<svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0.621 0 1.125-.504 1.125-1.125V9.375c0-.621.504-1.125 1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
						</svg>
					</div>
				</div>
				<div class="ml-5 w-0 flex-1">
					<dl>
						<dt class="text-sm font-medium text-gray-500 truncate">Pedidos Ativos</dt>
						<dd class="text-lg font-medium text-gray-900">{stats?.activeOrders || 0}</dd>
					</dl>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<div class="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
						<svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
				</div>
				<div class="ml-5 w-0 flex-1">
					<dl>
						<dt class="text-sm font-medium text-gray-500 truncate">Receita do Mês</dt>
						<dd class="text-lg font-medium text-gray-900">R$ {stats?.monthlyRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</dd>
					</dl>
				</div>
			</div>
		</div>
	</div>

	<!-- Content Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Recent Orders -->
		<div class="card">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg leading-6 font-medium text-gray-900">Pedidos Recentes</h3>
				<a href="/orders" class="text-sm text-primary-600 hover:text-primary-500">Ver todos</a>
			</div>
			
			{#if recentOrders && recentOrders.length > 0}
				<div class="flow-root">
					<ul class="-my-3 divide-y divide-gray-200">
						{#each recentOrders as order}
							{@const hasRentalItems = order.orderItems && order.orderItems.some((item: any) => item.itemType === 'RENTAL')}
							<li class="py-3">
								<div class="flex items-center space-x-4">
									<div class="flex-shrink-0">
										<div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
											<span class="text-xs font-medium text-primary-600">
												{hasRentalItems ? 'A' : 'V'}
											</span>
										</div>
									</div>
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium text-gray-900 truncate">
											{order.orderNumber}
										</p>
										<p class="text-sm text-gray-500 truncate">
											{order.customer?.name}
										</p>
									</div>
									<div class="flex-shrink-0 text-right">
										<p class="text-sm font-medium text-gray-900">
											R$ {order.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
										</p>
										<p class="text-sm text-gray-500">
											{new Date(order.orderDate).toLocaleDateString('pt-BR')}
										</p>
									</div>
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{:else}
				<p class="text-sm text-gray-500">Nenhum pedido recente encontrado.</p>
			{/if}
		</div>

		<!-- Low Stock Products -->
		<div class="card">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg leading-6 font-medium text-gray-900">Estoque Baixo</h3>
				<a href="/products" class="text-sm text-primary-600 hover:text-primary-500">Ver todos</a>
			</div>
			
			{#if lowStockProducts && lowStockProducts.length > 0}
				<div class="flow-root">
					<ul class="-my-3 divide-y divide-gray-200">
						{#each lowStockProducts as product}
							<li class="py-3">
								<div class="flex items-center space-x-4">
									<div class="flex-shrink-0">
										<div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
											<svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
											</svg>
										</div>
									</div>
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium text-gray-900 truncate">
											{product.name}
										</p>
										<p class="text-sm text-gray-500 truncate">
											SKU: {product.sku}
										</p>
									</div>
									<div class="flex-shrink-0">
										<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
											{product.stockQuantity} unid.
										</span>
									</div>
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{:else}
				<p class="text-sm text-gray-500">Todos os produtos estão com estoque adequado.</p>
			{/if}
		</div>
	</div>
</div>