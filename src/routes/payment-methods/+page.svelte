<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { notificationStore } from '$lib/stores/notifications.js';
	import PaymentMethodForm from '$lib/components/PaymentMethodForm.svelte';
	import DeleteConfirmModal from '$lib/components/DeleteConfirmModal.svelte';
	import type { PageData } from './$types';
	
	export let data: PageData;
	
	let searchTerm = data.search;
	let showForm = false;
	let showDeleteModal = false;
	let selectedPaymentMethod: any = null;
	let loading = false;
	
	// Reactive declarations
	let paymentMethods: any;
	let pagination: any;
	
	$: {
		paymentMethods = data.paymentMethods;
		pagination = data.pagination;
	}
	
	// Handle search
	function handleSearch() {
		const params = new URLSearchParams($page.url.searchParams);
		if (searchTerm.trim()) {
			params.set('search', searchTerm.trim());
		} else {
			params.delete('search');
		}
		params.delete('page'); // Reset to page 1 when searching
		goto(`/payment-methods?${params.toString()}`, { replaceState: true });
	}
	
	// Handle pagination
	function handlePagination(newPage: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', newPage.toString());
		goto(`/payment-methods?${params.toString()}`, { replaceState: true });
	}

	// Função para gerar páginas com elipses
	function generatePageNumbers(current: number, total: number): (number | '...')[] {
		const delta = 2; // Número de páginas ao redor da página atual
		const range: (number | '...')[] = [];
		const rangeWithDots: (number | '...')[] = [];

		for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
			range.push(i);
		}

		if (current - delta > 2) {
			rangeWithDots.push(1, '...');
		} else {
			rangeWithDots.push(1);
		}

		rangeWithDots.push(...range);

		if (current + delta < total - 1) {
			rangeWithDots.push('...', total);
		} else if (total > 1) {
			rangeWithDots.push(total);
		}

		return rangeWithDots;
	}
	
	// Handle create new payment method
	function handleCreatePaymentMethod() {
		selectedPaymentMethod = null;
		showForm = true;
	}
	
	// Handle edit payment method
	function handleEditPaymentMethod(paymentMethod: any) {
		selectedPaymentMethod = paymentMethod;
		showForm = true;
	}
	
	// Handle delete payment method
	function handleDeletePaymentMethod(paymentMethod: any) {
		selectedPaymentMethod = paymentMethod;
		showDeleteModal = true;
	}
	
	// Handle form submission
	async function handleFormSubmit(event: CustomEvent) {
		loading = true;
		try {
			const { paymentMethod, isEdit } = event.detail;
			
			const url = isEdit 
				? `/api/payment-methods/${selectedPaymentMethod.id}`
				: '/api/payment-methods';
			
			const method = isEdit ? 'PUT' : 'POST';
			
			const response = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(paymentMethod)
			});
			
			const result = await response.json();
			
			if (!response.ok) {
				throw new Error(result.error || 'Erro ao salvar meio de pagamento');
			}
			
			notificationStore.add({
				type: 'success',
				message: isEdit 
					? 'Meio de pagamento atualizado com sucesso!' 
					: 'Meio de pagamento criado com sucesso!'
			});
			
			showForm = false;
			// Reload page data
			location.reload();
		} catch (error) {
			notificationStore.add({
				type: 'error',
				message: error instanceof Error ? error.message : 'Erro inesperado'
			});
		} finally {
			loading = false;
		}
	}
	
	// Handle delete confirmation
	async function handleDeleteConfirm() {
		loading = true;
		try {
			const response = await fetch(`/api/payment-methods/${selectedPaymentMethod.id}`, {
				method: 'DELETE'
			});
			
			const result = await response.json();
			
			if (!response.ok) {
				throw new Error(result.error || 'Erro ao excluir meio de pagamento');
			}
			
			notificationStore.add({
				type: 'success',
				message: 'Meio de pagamento excluído com sucesso!'
			});
			
			showDeleteModal = false;
			// Reload page data
			location.reload();
		} catch (error) {
			notificationStore.add({
				type: 'error',
				message: error instanceof Error ? error.message : 'Erro inesperado'
			});
		} finally {
			loading = false;
		}
	}
	
	// Handle toggle active status
	async function handleToggleActive(paymentMethod: any) {
		loading = true;
		try {
			const response = await fetch(`/api/payment-methods/${paymentMethod.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					active: !paymentMethod.active
				})
			});
			
			const result = await response.json();
			
			if (!response.ok) {
				throw new Error(result.error || 'Erro ao atualizar status');
			}
			
			notificationStore.add({
				type: 'success',
				message: `Meio de pagamento ${result.active ? 'ativado' : 'desativado'} com sucesso!`
			});
			
			// Reload page data
			location.reload();
		} catch (error) {
			notificationStore.add({
				type: 'error',
				message: error instanceof Error ? error.message : 'Erro inesperado'
			});
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Meios de Pagamento - Mr. Fantasy</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Meios de Pagamento</h1>
			<p class="text-gray-600">Gerencie os meios de pagamento disponíveis</p>
		</div>
		<button
			on:click={handleCreatePaymentMethod}
			class="btn btn-primary"
			disabled={loading}
		>
			<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Novo Meio de Pagamento
		</button>
	</div>
	
	<!-- Search -->
	<div class="bg-white shadow rounded-lg p-6">
		<form on:submit|preventDefault={handleSearch} class="flex space-x-4">
			<div class="flex-1">
				<input
					bind:value={searchTerm}
					type="text"
					placeholder="Pesquisar meios de pagamento..."
					class="form-input w-full"
				/>
			</div>
			<!-- svelte-ignore a11y_consider_explicit_label -->
			<button type="submit" class="btn btn-primary">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</button>
		</form>
	</div>
	
	<!-- Payment Methods List -->
	<div class="bg-white shadow rounded-lg overflow-hidden">
		{#if paymentMethods.length === 0}
			<div class="p-8 text-center text-gray-500">
				{#if searchTerm}
					<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
					</svg>
					<h3 class="text-lg font-medium text-gray-900 mb-2">Nenhum resultado encontrado</h3>
					<p>Tente ajustar sua pesquisa ou criar um novo meio de pagamento.</p>
				{:else}
					<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z" />
					</svg>
					<h3 class="text-lg font-medium text-gray-900 mb-2">Nenhum meio de pagamento cadastrado</h3>
					<p class="mb-4">Comece criando seu primeiro meio de pagamento.</p>
					<button
						on:click={handleCreatePaymentMethod}
						class="btn btn-primary"
					>
						Criar Primeiro Meio de Pagamento
					</button>
				{/if}
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Nome
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Descrição
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Status
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Data de Criação
							</th>
							<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
								Ações
							</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each paymentMethods as paymentMethod}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">{paymentMethod.name}</div>
								</td>
								<td class="px-6 py-4">
									<div class="text-sm text-gray-900">{paymentMethod.description || '-'}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<button
										on:click={() => handleToggleActive(paymentMethod)}
										class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors
											{paymentMethod.active
												? 'bg-green-100 text-green-800 hover:bg-green-200'
												: 'bg-red-100 text-red-800 hover:bg-red-200'}"
										disabled={loading}
									>
										{paymentMethod.active ? 'Ativo' : 'Inativo'}
									</button>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{new Date(paymentMethod.createdAt).toLocaleDateString('pt-BR')}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
									<div class="flex items-center justify-end space-x-2">
										<button
											on:click={() => handleEditPaymentMethod(paymentMethod)}
											class="text-indigo-600 hover:text-indigo-900"
											disabled={loading}
											aria-label="Editar meio de pagamento"
										>
											<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
										</button>
										<button
											on:click={() => handleDeletePaymentMethod(paymentMethod)}
											class="text-red-600 hover:text-red-900"
											disabled={loading}
											aria-label="Excluir meio de pagamento"
										>
											<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
		{/if}
	</div>
	
	<!-- Pagination -->
	{#if pagination.pages > 1}
		<div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
			<div class="flex-1 flex justify-between sm:hidden">
				<button
					on:click={() => handlePagination(pagination.page - 1)}
					disabled={pagination.page === 1}
					class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Anterior
				</button>
				<button
					on:click={() => handlePagination(pagination.page + 1)}
					disabled={pagination.page === pagination.pages}
					class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Próximo
				</button>
			</div>
			<div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
				<div>
					<p class="text-sm text-gray-700">
						Mostrando <span class="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>
						até <span class="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span>
						de <span class="font-medium">{pagination.total}</span> resultados
					</p>
				</div>
				<div>
					<nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
						<button
							on:click={() => handlePagination(pagination.page - 1)}
							disabled={pagination.page === 1}
							class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<span class="sr-only">Anterior</span>
							<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
							</svg>
						</button>
						
						{#if pagination.pages <= 7}
							<!-- Para 7 ou menos páginas, mostrar todas normalmente -->
							{#each Array.from({ length: pagination.pages }, (_, i) => i + 1) as pageNum}
								{#if pageNum === pagination.page}
									<span class="relative inline-flex items-center px-4 py-2 border border-primary-500 bg-primary-50 text-sm font-medium text-primary-600">
										{pageNum}
									</span>
								{:else}
									<button
										on:click={() => handlePagination(pageNum)}
										class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
									>
										{pageNum}
									</button>
								{/if}
							{/each}
						{:else}
							<!-- Para mais de 7 páginas, usar paginação com elipses -->
							{#each generatePageNumbers(pagination.page, pagination.pages) as page}
								{#if page === '...'}
									<span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
										...
									</span>
								{:else if page === pagination.page}
									<span class="relative inline-flex items-center px-4 py-2 border border-primary-500 bg-primary-50 text-sm font-medium text-primary-600">
										{page}
									</span>
								{:else}
									<button
										on:click={() => handlePagination(page as number)}
										class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
									>
										{page}
									</button>
								{/if}
							{/each}
						{/if}

						<button
							on:click={() => handlePagination(pagination.page + 1)}
							disabled={pagination.page === pagination.pages}
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

<!-- Modals -->
{#if showForm}
	<PaymentMethodForm
		paymentMethod={selectedPaymentMethod}
		on:submit={handleFormSubmit}
		on:cancel={() => showForm = false}
	/>
{/if}

{#if showDeleteModal}
	<DeleteConfirmModal
		title="Excluir Meio de Pagamento"
		message="Tem certeza que deseja excluir o meio de pagamento '{selectedPaymentMethod?.name}'? Esta ação não pode ser desfeita."
		on:confirm={handleDeleteConfirm}
		on:cancel={() => showDeleteModal = false}
	/>
{/if}