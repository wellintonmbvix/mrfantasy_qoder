<script lang="ts">
	import { onMount } from 'svelte';
	import { customers } from '$lib/stores/customers.js';
	import { ui, notify } from '$lib/stores/ui.js';
	import CustomerForm from '$lib/components/CustomerForm.svelte';
	import DeleteConfirmModal from '$lib/components/DeleteConfirmModal.svelte';

	let search = '';
	let selectedCustomer: any = null;
	let deleteCustomerId: number | null = null;
	let currentPage = 1;
	const itemsPerPage = 10;

	$: customersData = $customers;
	$: uiState = $ui;

	onMount(() => {
		loadCustomers();
	});

	async function loadCustomers() {
		await customers.fetch({
			search: search.trim(),
			page: currentPage,
			limit: itemsPerPage
		});
	}

	function handleSearch() {
		currentPage = 1;
		loadCustomers();
	}

	function openCreateForm() {
		selectedCustomer = null;
		ui.openModal('customerForm');
	}

	function openEditForm(customer: any) {
		selectedCustomer = customer;
		ui.openModal('customerForm');
	}

	function openDeleteModal(customerId: number) {
		deleteCustomerId = customerId;
		ui.openModal('deleteConfirm');
	}

	async function handleFormSubmit(event: CustomEvent) {
		const { customer: customerData, isEdit } = event.detail;

		let result;
		if (isEdit) {
			result = await customers.update(selectedCustomer.id, customerData);
		} else {
			result = await customers.create(customerData);
		}

		if (result.success) {
			notify.success(isEdit ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!');
			ui.closeModal('customerForm');
			loadCustomers();
		} else {
			notify.error(result.error || 'Erro ao salvar cliente');
		}
	}

	async function handleDelete() {
		if (deleteCustomerId) {
			const result = await customers.delete(deleteCustomerId);
			
			if (result.success) {
				notify.success('Cliente removido com sucesso!');
				ui.closeModal('deleteConfirm');
				loadCustomers();
			} else {
				notify.error(result.error || 'Erro ao remover cliente');
			}
		}
		deleteCustomerId = null;
	}

	function changePage(page: number) {
		currentPage = page;
		loadCustomers();
	}
</script>

<svelte:head>
	<title>Clientes - Mr. Fantasy</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-2xl font-semibold text-gray-900">Clientes</h1>
			<p class="mt-1 text-sm text-gray-500">
				Gerencie todos os clientes do sistema
			</p>
		</div>
		<button
			on:click={openCreateForm}
			class="btn btn-primary"
		>
			<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Novo Cliente
		</button>
	</div>

	<!-- Search -->
	<div class="flex flex-col sm:flex-row gap-4">
		<div class="flex-1">
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
					placeholder="Buscar por nome, email, telefone ou documento..."
					class="form-input pl-10"
				/>
			</div>
		</div>
		<button
			on:click={handleSearch}
			class="btn btn-secondary"
		>
			Buscar
		</button>
	</div>

	<!-- Error Message -->
	{#if customersData.error}
		<div class="rounded-md bg-red-50 p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
					</svg>
				</div>
				<div class="ml-3">
					<p class="text-sm text-red-800">{customersData.error}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Loading -->
	{#if customersData.loading}
		<div class="text-center py-12">
			<svg class="animate-spin h-8 w-8 text-primary-600 mx-auto" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
			<p class="mt-2 text-sm text-gray-500">Carregando clientes...</p>
		</div>
	{:else if customersData.customers.length === 0}
		<!-- Empty State -->
		<div class="text-center py-12">
			<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A10.003 10.003 0 0124 26c4.21 0 7.813 2.602 9.288 6.286M30 14a6 6 0 11-12 0 6 6 0 0112 0zm12 6a4 4 0 11-8 0 4 4 0 018 0zm-28 0a4 4 0 11-8 0 4 4 0 018 0z" />
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900">Nenhum cliente encontrado</h3>
			<p class="mt-1 text-sm text-gray-500">Comece criando seu primeiro cliente.</p>
			<div class="mt-6">
				<button
					on:click={openCreateForm}
					class="btn btn-primary"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					Novo Cliente
				</button>
			</div>
		</div>
	{:else}
		<!-- Customers Table -->
		<div class="card p-0 overflow-hidden">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Cliente
							</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Contato
							</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Documento
							</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Cadastro
							</th>
							<th scope="col" class="relative px-6 py-3">
								<span class="sr-only">Ações</span>
							</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each customersData.customers as customer (customer.id)}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<div>
										<div class="text-sm font-medium text-gray-900">{customer.name}</div>
										<div class="text-sm text-gray-500">{customer.email}</div>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm text-gray-900">{customer.phone}</div>
									<div class="text-sm text-gray-500 truncate max-w-xs">{customer.address}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{customer.documentNumber}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{new Date(customer.createdAt).toLocaleDateString('pt-BR')}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
									<div class="flex justify-end space-x-2">
										<button
											on:click={() => openEditForm(customer)}
											class="text-primary-600 hover:text-primary-900"
											title="Editar"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
										</button>
										<button
											on:click={() => openDeleteModal(customer.id)}
											class="text-red-600 hover:text-red-900"
											title="Excluir"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			{#if customersData.pagination && customersData.pagination.pages > 1}
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
							disabled={currentPage >= customersData.pagination.pages}
							class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Próximo
						</button>
					</div>
					<div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
						<div>
							<p class="text-sm text-gray-700">
								Mostrando <span class="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
								até <span class="font-medium">{Math.min(currentPage * itemsPerPage, customersData.pagination.total)}</span>
								de <span class="font-medium">{customersData.pagination.total}</span> resultados
							</p>
						</div>
						<div>
							<nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
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
								
								{#each Array.from({length: customersData.pagination.pages}, (_, i) => i + 1) as page}
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
									disabled={currentPage >= customersData.pagination.pages}
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

<!-- Customer Form Modal -->
{#if uiState.modals.customerForm}
	<CustomerForm
		customer={selectedCustomer}
		on:submit={handleFormSubmit}
		on:cancel={() => ui.closeModal('customerForm')}
	/>
{/if}

<!-- Delete Confirmation Modal -->
{#if uiState.modals.deleteConfirm}
	<DeleteConfirmModal
		title="Excluir Cliente"
		message="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita."
		on:confirm={handleDelete}
		on:cancel={() => ui.closeModal('deleteConfirm')}
	/>
{/if}