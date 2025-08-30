<script lang="ts">
	import { onMount } from 'svelte';
	import { products } from '$lib/stores/products.js';
	import { ui, notify } from '$lib/stores/ui.js';
	import ProductForm from '$lib/components/ProductForm.svelte';
	import GroupForm from '$lib/components/GroupForm.svelte';
	import DeleteConfirmModal from '$lib/components/DeleteConfirmModal.svelte';

	let search = '';
	let selectedProductType = '';
	let selectedGroupId = '';
	let selectedProduct: any = null;
	let selectedGroup: any = null;
	let deleteProductId: number | null = null;
	let deleteGroupId: number | null = null;
	let currentPage = 1;
	let activeTab = 'products'; // 'products' or 'groups'
	const itemsPerPage = 12;
	
	// Reactive declarations
	let productsData: any;
	let uiState: any;
	
	$: {
		productsData = $products;
		uiState = $ui;
	}

	onMount(() => {
		loadData();
	});

	async function loadData() {
		await Promise.all([
			loadProducts(),
			products.fetchGroups()
		]);
	}

	async function loadProducts() {
		await products.fetchProducts({
			search: search.trim(),
			groupId: selectedGroupId ? parseInt(selectedGroupId) : undefined,
			productType: selectedProductType || undefined,
			page: currentPage,
			limit: itemsPerPage
		});
	}

	function handleSearch() {
		currentPage = 1;
		loadProducts();
	}

	function resetFilters() {
		search = '';
		selectedProductType = '';
		selectedGroupId = '';
		currentPage = 1;
		loadProducts();
	}

	// Product functions
	function openCreateProductForm() {
		selectedProduct = null;
		ui.openModal('productForm');
	}

	function openEditProductForm(product: any) {
		selectedProduct = product;
		ui.openModal('productForm');
	}

	function openDeleteProductModal(productId: number) {
		deleteProductId = productId;
		ui.openModal('deleteConfirm');
	}

	async function handleProductSubmit(event: CustomEvent) {
		const { product: productData, isEdit } = event.detail;

		let result;
		if (isEdit) {
			result = await products.updateProduct(selectedProduct.id, productData);
		} else {
			result = await products.createProduct(productData);
		}

		if (result.success) {
			notify.success(isEdit ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!');
			ui.closeModal('productForm');
			loadProducts();
		} else {
			notify.error(result.error || 'Erro ao salvar produto');
		}
	}

	async function handleProductDelete() {
		if (deleteProductId) {
			const result = await products.deleteProduct(deleteProductId);
			
			if (result.success) {
				notify.success('Produto removido com sucesso!');
				ui.closeModal('deleteConfirm');
				loadProducts();
			} else {
				notify.error(result.error || 'Erro ao remover produto');
			}
		}
		deleteProductId = null;
	}

	// Group functions
	function openCreateGroupForm() {
		selectedGroup = null;
		ui.openModal('groupForm');
	}

	function openEditGroupForm(group: any) {
		selectedGroup = group;
		ui.openModal('groupForm');
	}

	function openDeleteGroupModal(groupId: number) {
		deleteGroupId = groupId;
		ui.openModal('deleteConfirm');
	}

	async function handleGroupSubmit(event: CustomEvent) {
		const { group: groupData, isEdit } = event.detail;

		let result;
		if (isEdit) {
			result = await products.updateGroup(selectedGroup.id, groupData);
		} else {
			result = await products.createGroup(groupData);
		}

		if (result.success) {
			notify.success(isEdit ? 'Grupo atualizado com sucesso!' : 'Grupo criado com sucesso!');
			ui.closeModal('groupForm');
			products.fetchGroups();
		} else {
			notify.error(result.error || 'Erro ao salvar grupo');
		}
	}

	async function handleGroupDelete() {
		if (deleteGroupId) {
			const result = await products.deleteGroup(deleteGroupId);
			
			if (result.success) {
				notify.success('Grupo removido com sucesso!');
				ui.closeModal('deleteConfirm');
				products.fetchGroups();
			} else {
				notify.error(result.error || 'Erro ao remover grupo');
			}
		}
		deleteGroupId = null;
	}

	function changePage(page: number) {
		currentPage = page;
		loadProducts();
	}

	function getStockStatusColor(stockQuantity: number) {
		if (stockQuantity === 0) return 'bg-red-100 text-red-800';
		if (stockQuantity <= 5) return 'bg-yellow-100 text-yellow-800';
		return 'bg-green-100 text-green-800';
	}

	function getProductTypeLabel(type: string) {
		return type === 'FANTASY' ? 'Fantasia' : 'Acessório';
	}
</script>

<svelte:head>
	<title>Produtos - Mr. Fantasy</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-2xl font-semibold text-gray-900">Produtos</h1>
			<p class="mt-1 text-sm text-gray-500">
				Gerencie produtos e grupos de produtos do sistema
			</p>
		</div>
	</div>

	<!-- Tabs -->
	<div class="border-b border-gray-200">
		<nav class="-mb-px flex space-x-8">
			<button
				on:click={() => activeTab = 'products'}
				class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'products' 
					? 'border-primary-500 text-primary-600' 
					: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				Produtos
			</button>
			<button
				on:click={() => activeTab = 'groups'}
				class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'groups' 
					? 'border-primary-500 text-primary-600' 
					: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				Grupos
			</button>
		</nav>
	</div>

	{#if activeTab === 'products'}
		<!-- Products Tab -->
		<div class="space-y-6">
			<!-- Actions -->
			<div class="flex justify-between items-center">
				<button
					on:click={openCreateProductForm}
					class="btn btn-primary"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					Novo Produto
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
							placeholder="Buscar por nome, SKU ou descrição..."
							class="form-input pl-10"
						/>
					</div>
				</div>
				<div>
					<select bind:value={selectedProductType} class="form-input">
						<option value="">Todos os tipos</option>
						<option value="FANTASY">Fantasias</option>
						<option value="ACCESSORY">Acessórios</option>
					</select>
				</div>
				<div>
					<select bind:value={selectedGroupId} class="form-input">
						<option value="">Todos os grupos</option>
						{#each productsData.groups as group}
							<option value={group.id}>{group.name}</option>
						{/each}
					</select>
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
			{#if productsData.error}
				<div class="rounded-md bg-red-50 p-4">
					<div class="flex">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
							</svg>
						</div>
						<div class="ml-3">
							<p class="text-sm text-red-800">{productsData.error}</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Loading -->
			{#if productsData.loading}
				<div class="text-center py-12">
					<svg class="animate-spin h-8 w-8 text-primary-600 mx-auto" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					<p class="mt-2 text-sm text-gray-500">Carregando produtos...</p>
				</div>
			{:else if productsData.products.length === 0}
				<!-- Empty State -->
				<div class="text-center py-12">
					<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 21h6" />
					</svg>
					<h3 class="mt-2 text-sm font-medium text-gray-900">Nenhum produto encontrado</h3>
					<p class="mt-1 text-sm text-gray-500">Comece criando seu primeiro produto.</p>
					<div class="mt-6">
						<button on:click={openCreateProductForm} class="btn btn-primary">
							<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
							</svg>
							Novo Produto
						</button>
					</div>
				</div>
			{:else}
				<!-- Products Grid -->
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
					{#each productsData.products as product (product.id)}
						<div class="card hover:shadow-md transition-shadow">
							<!-- Product Image -->
							<div class="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200 mb-4">
								{#if product.imageUrl}
									<img
										src={product.imageUrl}
										alt={product.name}
										class="h-48 w-full object-cover object-center"
									/>
								{:else}
									<div class="h-48 w-full flex items-center justify-center bg-gray-100">
										<svg class="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L32 16m-2-2l1.586-1.586a2 2 0 012.828 0L48 16" />
										</svg>
									</div>
								{/if}
							</div>

							<!-- Product Info -->
							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<h3 class="text-sm font-medium text-gray-900 truncate">{product.name}</h3>
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStockStatusColor(product.stockQuantity)}">
										{product.stockQuantity}
									</span>
								</div>

								<p class="text-xs text-gray-500">{product.sku}</p>
								
								<div class="flex items-center justify-between">
									<span class="text-xs text-gray-500">{getProductTypeLabel(product.productType)}</span>
									<span class="text-xs text-gray-500">{product.group?.name}</span>
								</div>

								<div class="flex justify-between items-center">
									<div class="text-sm">
										<div class="text-gray-900 font-medium">A: R$ {product.rentalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
										<div class="text-gray-500">V: R$ {product.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
									</div>
									<div class="flex space-x-1">
										<!-- svelte-ignore a11y_consider_explicit_label -->
										<button
											on:click={() => openEditProductForm(product)}
											class="text-primary-600 hover:text-primary-900"
											title="Editar"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
										</button>
										<!-- svelte-ignore a11y_consider_explicit_label -->
										<button
											on:click={() => openDeleteProductModal(product.id)}
											class="text-red-600 hover:text-red-900"
											title="Excluir"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
										</button>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Pagination -->
				{#if productsData.pagination && productsData.pagination.pages > 1}
					<div class="flex items-center justify-between">
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
								disabled={currentPage >= productsData.pagination.pages}
								class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Próximo
							</button>
						</div>
						<div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
							<div>
								<p class="text-sm text-gray-700">
									Mostrando <span class="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
									até <span class="font-medium">{Math.min(currentPage * itemsPerPage, productsData.pagination.total)}</span>
									de <span class="font-medium">{productsData.pagination.total}</span> resultados
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
									
									{#each Array.from({length: Math.min(productsData.pagination.pages, 5)}, (_, i) => i + 1) as page}
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
										disabled={currentPage >= productsData.pagination.pages}
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
			{/if}
		</div>
	{:else}
		<!-- Groups Tab -->
		<div class="space-y-6">
			<!-- Actions -->
			<div class="flex justify-between items-center">
				<button
					on:click={openCreateGroupForm}
					class="btn btn-primary"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					Novo Grupo
				</button>
			</div>

			<!-- Groups Grid -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each productsData.groups as group (group.id)}
					<div class="card hover:shadow-md transition-shadow">
						<div class="flex items-center justify-between mb-4">
							<h3 class="text-lg font-medium text-gray-900">{group.name}</h3>
							<div class="flex space-x-2">
								<!-- svelte-ignore a11y_consider_explicit_label -->
								<button
									on:click={() => openEditGroupForm(group)}
									class="text-primary-600 hover:text-primary-900"
									title="Editar"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
									</svg>
								</button>
								<!-- svelte-ignore a11y_consider_explicit_label -->
								<button
									on:click={() => openDeleteGroupModal(group.id)}
									class="text-red-600 hover:text-red-900"
									title="Excluir"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									</svg>
								</button>
							</div>
						</div>
						
						{#if group.description}
							<p class="text-sm text-gray-600 mb-3">{group.description}</p>
						{/if}
						
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium text-gray-500">Categoria: {group.category}</span>
							<span class="text-sm text-gray-400">
								{group._count?.products || 0} produtos
							</span>
						</div>
					</div>
				{/each}
			</div>

			{#if productsData.groups.length === 0}
				<!-- Empty State -->
				<div class="text-center py-12">
					<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5a2 2 0 00-2 2v8a2 2 0 002 2h14m-5-6a2 2 0 002-2V7a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5" />
					</svg>
					<h3 class="mt-2 text-sm font-medium text-gray-900">Nenhum grupo encontrado</h3>
					<p class="mt-1 text-sm text-gray-500">Comece criando seu primeiro grupo de produtos.</p>
					<div class="mt-6">
						<button on:click={openCreateGroupForm} class="btn btn-primary">
							<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
							</svg>
							Novo Grupo
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Product Form Modal -->
{#if uiState.modals.productForm}
	<ProductForm
		product={selectedProduct}
		groups={productsData.groups}
		on:submit={handleProductSubmit}
		on:cancel={() => ui.closeModal('productForm')}
	/>
{/if}

<!-- Group Form Modal -->
{#if uiState.modals.groupForm}
	<GroupForm
		group={selectedGroup}
		on:submit={handleGroupSubmit}
		on:cancel={() => ui.closeModal('groupForm')}
	/>
{/if}

<!-- Delete Confirmation Modal -->
{#if uiState.modals.deleteConfirm}
	<DeleteConfirmModal
		title={deleteProductId ? 'Excluir Produto' : 'Excluir Grupo'}
		message={deleteProductId 
			? 'Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.' 
			: 'Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.'}
		on:confirm={deleteProductId ? handleProductDelete : handleGroupDelete}
		on:cancel={() => ui.closeModal('deleteConfirm')}
	/>
{/if}