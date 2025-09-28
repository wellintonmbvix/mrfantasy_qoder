<script lang="ts">
	import { onMount } from 'svelte';
	import { 
		cashTransactions, 
		cashTransactionActions, 
		transactionTypeLabels,
		transactionTypeOperations,
		type CashTransactionType 
	} from '$lib/stores/cashTransactions';
	import { auth } from '$lib/stores/auth';
	import { notificationStore } from '$lib/stores/notifications';

	// Estado local
	let showCreateForm = false;
	let showCancelModal = false;
	let showFilters = false;
	let selectedTransactionId: number | null = null;
	let cancelReason = '';

	// Filtros locais
	let localFilters = {
		type: '',
		status: 'ACTIVE',
		startDate: new Date().toISOString().split('T')[0], // Data atual
		endDate: new Date().toISOString().split('T')[0] // Data atual também para endDate
	};

	// Form de criação
	let newTransaction = {
		type: 'FUND' as CashTransactionType,
		amount: 0,
		description: ''
	};

	// Reactive variables
	$: user = $auth.user;
	$: canCancel = user?.role === 'ADMIN' || user?.role === 'MANAGER';

	// Cálculo do resumo dos valores
	$: totalCredits = (() => {
		const validTransactions = Array.isArray($cashTransactions.transactions) ? $cashTransactions.transactions : [];
		const transactionCredits = validTransactions
			.filter(t => transactionTypeOperations[t.type] === 'CREDIT')
			.reduce((sum, t) => sum + Number(t.amount || 0), 0);
		const cashPayments = Number($cashTransactions.cashPaymentsSum) || 0;
		return transactionCredits + cashPayments;
	})();
	
	$: totalDebits = (() => {
		const validTransactions = Array.isArray($cashTransactions.transactions) ? $cashTransactions.transactions : [];
		return validTransactions
			.filter(t => transactionTypeOperations[t.type] === 'DEBIT')
			.reduce((sum, t) => sum + Number(t.amount || 0), 0);
	})();
	
	$: netBalance = totalCredits - totalDebits;

	onMount(() => {
		// Aplicar filtros iniciais com a data atual
		cashTransactionActions.fetchTransactions({
			status: 'ACTIVE',
			startDate: localFilters.startDate,
			endDate: localFilters.endDate
		});
	});

	// Funções auxiliares
	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL'
		}).format(value);
	}

	function formatDateTime(date: string | Date): string {
		return new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(date));
	}

	function getOperationColor(type: CashTransactionType): string {
		const operation = transactionTypeOperations[type];
		return operation === 'CREDIT' ? 'text-green-600' : 'text-red-600';
	}

	function getOperationBadgeClass(type: CashTransactionType): string {
		const operation = transactionTypeOperations[type];
		return operation === 'CREDIT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
	}

	function getOperationSymbol(type: CashTransactionType): string {
		const operation = transactionTypeOperations[type];
		return operation === 'CREDIT' ? '+' : '-';
	}

	// Handlers
	async function handleCreateTransaction() {
		if (!newTransaction.type || newTransaction.amount <= 0) {
			notificationStore.add({
				message: 'Preencha todos os campos obrigatórios',
				type: 'error'
			});
			return;
		}

		try {
			await cashTransactionActions.createTransaction(newTransaction);
			notificationStore.add({
				message: 'Lançamento criado com sucesso!',
				type: 'success'
			});
			
			// Reset form
			newTransaction = {
				type: 'FUND',
				amount: 0,
				description: ''
			};
			showCreateForm = false;
		} catch (error) {
			// Erro já tratado no store
		}
	}

	// Funções de filtro e paginação
	async function applyFilters() {
		const filters: any = { page: 1 };
		
		if (localFilters.type) filters.type = localFilters.type;
		if (localFilters.status && localFilters.status !== 'ALL') filters.status = localFilters.status;
		if (localFilters.startDate) filters.startDate = localFilters.startDate;
		if (localFilters.endDate) filters.endDate = localFilters.endDate;
		
		await cashTransactionActions.fetchTransactions(filters);
	}

	async function resetFilters() {
		localFilters = {
			type: '',
			status: 'ACTIVE',
			startDate: new Date().toISOString().split('T')[0], // Manter data atual
			endDate: new Date().toISOString().split('T')[0] // Manter data atual também
		};
		await cashTransactionActions.fetchTransactions({ 
			page: 1, 
			status: 'ACTIVE',
			startDate: localFilters.startDate,
			endDate: localFilters.endDate
		});
	}

	async function changePage(page: number) {
		const currentFilters = $cashTransactions.filters;
		await cashTransactionActions.fetchTransactions({ ...currentFilters, page });
	}

	// Função para gerar páginas com elipses (replicada do componente de clientes)
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

	function openCancelModal(transactionId: number) {
		selectedTransactionId = transactionId;
		cancelReason = '';
		showCancelModal = true;
	}

	async function handleCancelTransaction() {
		if (!selectedTransactionId || !cancelReason.trim()) {
			notificationStore.add({
				message: 'Motivo do cancelamento é obrigatório',
				type: 'error'
			});
			return;
		}

		try {
			await cashTransactionActions.cancelTransaction(selectedTransactionId, cancelReason);
			notificationStore.add({
				message: 'Lançamento cancelado com sucesso!',
				type: 'success'
			});
			showCancelModal = false;
			selectedTransactionId = null;
			cancelReason = '';
		} catch (error) {
			// Erro já tratado no store
		}
	}

	function closeModal() {
		showCancelModal = false;
		selectedTransactionId = null;
		cancelReason = '';
	}
</script>

<svelte:head>
	<title>Lançamentos de Caixa</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="flex justify-between items-center mb-8">
		<h1 class="text-3xl font-bold text-gray-900">Lançamentos de Caixa</h1>
		<div class="flex gap-2">
			<button 
				on:click={() => showFilters = !showFilters}
				class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
			>
				{showFilters ? 'Ocultar Filtros' : 'Filtros'}
			</button>
			<button 
				on:click={() => showCreateForm = !showCreateForm}
				class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
			>
				{showCreateForm ? 'Cancelar' : 'Novo Lançamento'}
			</button>
		</div>
	</div>

	<!-- Filtros -->
	{#if showFilters}
		<div class="bg-white rounded-lg shadow-md p-6 mb-8">
			<h2 class="text-lg font-semibold mb-4">Filtros</h2>
			
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<div>
					<label for="filterType" class="block text-sm font-medium text-gray-700 mb-2">
						Tipo
					</label>
					<select 
						id="filterType"
						bind:value={localFilters.type}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="">Todos os tipos</option>
						{#each Object.entries(transactionTypeLabels) as [key, label]}
							<option value={key}>{label}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="filterStatus" class="block text-sm font-medium text-gray-700 mb-2">
						Status
					</label>
					<select 
						id="filterStatus"
						bind:value={localFilters.status}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="ALL">Todos</option>
						<option value="ACTIVE">Ativos</option>
						<option value="CANCELLED">Cancelados</option>
					</select>
				</div>

				<div>
					<label for="filterStartDate" class="block text-sm font-medium text-gray-700 mb-2">
						Data Inicial
					</label>
					<input 
						id="filterStartDate"
						type="date"
						bind:value={localFilters.startDate}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<div>
					<label for="filterEndDate" class="block text-sm font-medium text-gray-700 mb-2">
						Data Final
					</label>
					<input 
						id="filterEndDate"
						type="date"
						bind:value={localFilters.endDate}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
			</div>

			<div class="flex gap-4 mt-4">
				<button 
					on:click={applyFilters}
					class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
					disabled={$cashTransactions.loading}
				>
					{$cashTransactions.loading ? 'Filtrando...' : 'Aplicar Filtros'}
				</button>
				<button 
					on:click={resetFilters}
					class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
					disabled={$cashTransactions.loading}
				>
					Limpar Filtros
				</button>
			</div>
		</div>
	{/if}

	<!-- Formulário de Criação -->
	{#if showCreateForm}
		<div class="bg-white rounded-lg shadow-md p-6 mb-8">
			<h2 class="text-xl font-semibold mb-4">Novo Lançamento</h2>
			
			<form on:submit|preventDefault={handleCreateTransaction} class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label for="type" class="block text-sm font-medium text-gray-700 mb-2">
						Tipo de Lançamento *
					</label>
					<select 
						id="type"
						bind:value={newTransaction.type}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						required
					>
						{#each Object.entries(transactionTypeLabels) as [key, label]}
							<option value={key}>{label}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="amount" class="block text-sm font-medium text-gray-700 mb-2">
						Valor *
					</label>
					<input 
						id="amount"
						type="number"
						step="0.01"
						min="0.01"
						bind:value={newTransaction.amount}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="0,00"
						required
					/>
				</div>

				<div class="md:col-span-2">
					<label for="description" class="block text-sm font-medium text-gray-700 mb-2">
						Descrição/Observações
					</label>
					<textarea 
						id="description"
						bind:value={newTransaction.description}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						rows="3"
						placeholder="Descrição opcional do lançamento..."
					></textarea>
				</div>

				<div class="md:col-span-2 flex gap-4">
					<button 
						type="submit"
						class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
						disabled={$cashTransactions.loading}
					>
						{$cashTransactions.loading ? 'Salvando...' : 'Salvar Lançamento'}
					</button>
					<button 
						type="button"
						on:click={() => showCreateForm = false}
						class="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
					>
						Cancelar
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Loading -->
	{#if $cashTransactions.loading}
		<div class="text-center py-12">
			<svg class="animate-spin h-8 w-8 text-primary-600 mx-auto" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
			<p class="mt-2 text-sm text-gray-500">Carregando lançamentos...</p>
		</div>
	{:else if $cashTransactions.error}
		<div class="text-center py-12">
			<svg class="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900">Erro ao carregar transações</h3>
			<p class="mt-1 text-sm text-gray-500">{$cashTransactions.error}</p>
			<button 
				on:click={() => cashTransactionActions.fetchTransactions()}
				class="mt-2 btn btn-secondary"
			>
				Tentar novamente
			</button>
		</div>
	{:else if $cashTransactions.transactions.length === 0}
		<!-- Empty State -->
		<div class="text-center py-12">
			<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12s-1.536-.219-2.121-.659c-1.172-.879-1.172-2.303 0-3.182C10.464 7.781 11.232 8 12 8s1.536.219 2.121.659" />
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900">Nenhum lançamento encontrado</h3>
			<p class="mt-1 text-sm text-gray-500">
				{localFilters.type || localFilters.startDate || localFilters.endDate || localFilters.status !== 'ACTIVE' 
					? 'Tente ajustar os filtros de busca.' 
					: 'Comece criando seu primeiro lançamento.'}
			</p>
			{#if !localFilters.type && !localFilters.startDate && !localFilters.endDate && localFilters.status === 'ACTIVE'}
				<div class="mt-6">
					<button on:click={() => showCreateForm = true} class="btn btn-primary">
						<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Novo Lançamento
					</button>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Resumo dos Valores -->
		{#if $cashTransactions.transactions.length > 0}
			<div class="bg-white rounded-lg shadow-md p-6 mb-6">
				<h2 class="text-lg font-semibold mb-4">Resumo dos Lançamentos</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<!-- Total de Créditos -->
					<div class="bg-green-50 border border-green-200 rounded-lg p-4">
						<div class="flex items-center">
							<svg class="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
							</svg>
							<div>
								<p class="text-sm font-medium text-green-600">Total de Entradas</p>
								<p class="text-xs text-green-500 mb-1">Inclui pagamentos em dinheiro</p>
								<p class="text-2xl font-bold text-green-800">{formatCurrency(totalCredits)}</p>
							</div>
						</div>
					</div>

					<!-- Total de Débitos -->
					<div class="bg-red-50 border border-red-200 rounded-lg p-4">
						<div class="flex items-center">
							<svg class="w-8 h-8 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
							</svg>
							<div>
								<p class="text-sm font-medium text-red-600">Total de Saídas</p>
								<p class="text-2xl font-bold text-red-800">{formatCurrency(totalDebits)}</p>
							</div>
						</div>
					</div>

					<!-- Saldo Líquido -->
					<div class="{netBalance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'} border rounded-lg p-4">
						<div class="flex items-center">
							<svg class="w-8 h-8 {netBalance >= 0 ? 'text-blue-600' : 'text-yellow-600'} mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
							</svg>
							<div>
								<p class="text-sm font-medium {netBalance >= 0 ? 'text-blue-600' : 'text-yellow-600'}">Saldo Líquido</p>
								<p class="text-2xl font-bold {netBalance >= 0 ? 'text-blue-800' : 'text-yellow-800'}">{formatCurrency(netBalance)}</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Transactions Table -->
		<div class="card p-0 overflow-hidden">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Data/Hora
							</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Tipo
							</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Valor
							</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Usuário
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
						{#each $cashTransactions.transactions as transaction (transaction.id)}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">
										{formatDateTime(transaction.createdAt).split(' ')[0]}
									</div>
									<div class="text-sm text-gray-500">
										{formatDateTime(transaction.createdAt).split(' ')[1]}
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getOperationBadgeClass(transaction.type)}">
										{transactionTypeLabels[transaction.type]}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium {getOperationColor(transaction.type)}">
										{getOperationSymbol(transaction.type)} {formatCurrency(transaction.amount)}
									</div>
									{#if transaction.description}
										<div class="text-sm text-gray-500 truncate max-w-xs" title={transaction.description}>
											{transaction.description}
										</div>
									{/if}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">{transaction.user.username}</div>
									<div class="text-sm text-gray-500">{transaction.user.email}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									{#if transaction.status === 'ACTIVE'}
										<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
											Ativo
										</span>
									{:else}
										<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
											Cancelado
										</span>
										{#if transaction.cancelledByUser}
											<div class="text-xs text-gray-500 mt-1">
												por {transaction.cancelledByUser.username}
											</div>
										{/if}
									{/if}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
									{#if transaction.status === 'ACTIVE' && canCancel}
										<button 
											on:click={() => openCancelModal(transaction.id)}
											class="text-red-600 hover:text-red-900 transition-colors"
											title="Cancelar lançamento"
											aria-label="Cancelar lançamento"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
										</button>
									{:else}
										<span class="text-gray-400">-</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			{#if $cashTransactions.pagination && $cashTransactions.pagination.pages > 1}
				<div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
					<div class="flex-1 flex justify-between sm:hidden">
						<button
							on:click={() => changePage(($cashTransactions.pagination?.page || 1) - 1)}
							disabled={($cashTransactions.pagination?.page || 1) <= 1 || $cashTransactions.loading}
							class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Anterior
						</button>
						<button
							on:click={() => changePage(($cashTransactions.pagination?.page || 1) + 1)}
							disabled={($cashTransactions.pagination?.page || 1) >= ($cashTransactions.pagination?.pages || 1) || $cashTransactions.loading}
							class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Próximo
						</button>
					</div>
					<div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
						<div>
							<p class="text-sm text-gray-700">
								Mostrando <span class="font-medium">{(($cashTransactions.pagination?.page || 1) - 1) * ($cashTransactions.pagination?.limit || 10) + 1}</span>
								até <span class="font-medium">{Math.min(($cashTransactions.pagination?.page || 1) * ($cashTransactions.pagination?.limit || 10), $cashTransactions.pagination?.total || 0)}</span>
								de <span class="font-medium">{$cashTransactions.pagination?.total || 0}</span> resultados
							</p>
						</div>
						<div>
							<nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
								<button
									on:click={() => changePage(($cashTransactions.pagination?.page || 1) - 1)}
									disabled={($cashTransactions.pagination?.page || 1) <= 1 || $cashTransactions.loading}
									class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<span class="sr-only">Anterior</span>
									<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
									</svg>
								</button>
								
								{#if $cashTransactions.pagination?.pages && $cashTransactions.pagination.pages <= 7}
									<!-- Para 7 ou menos páginas, mostrar todas normalmente -->
									{#each Array.from({ length: $cashTransactions.pagination.pages }, (_, i) => i + 1) as pageNum}
										{#if pageNum === ($cashTransactions.pagination?.page || 1)}
											<span class="relative inline-flex items-center px-4 py-2 border border-primary-500 bg-primary-50 text-sm font-medium text-primary-600">
												{pageNum}
											</span>
										{:else}
											<button
												on:click={() => changePage(pageNum)}
												class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
											>
												{pageNum}
											</button>
										{/if}
									{/each}
								{:else}
									<!-- Para mais de 7 páginas, usar paginação com elipses -->
									{#each generatePageNumbers($cashTransactions.pagination?.page || 1, $cashTransactions.pagination?.pages || 1) as page}
										{#if page === '...'}
											<span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
												...
											</span>
										{:else if page === ($cashTransactions.pagination?.page || 1)}
											<span class="relative inline-flex items-center px-4 py-2 border border-primary-500 bg-primary-50 text-sm font-medium text-primary-600">
												{page}
											</span>
										{:else}
											<button
												on:click={() => changePage(page as number)}
												class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
											>
												{page}
											</button>
										{/if}
									{/each}
								{/if}

								<button
									on:click={() => changePage(($cashTransactions.pagination?.page || 1) + 1)}
									disabled={($cashTransactions.pagination?.page || 1) >= ($cashTransactions.pagination?.pages || 1) || $cashTransactions.loading}
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

<!-- Modal de Cancelamento -->
{#if showCancelModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
			<h3 class="text-lg font-semibold mb-4">Cancelar Lançamento</h3>
			
			<p class="text-gray-600 mb-4">
				Tem certeza que deseja cancelar este lançamento? Esta ação não pode ser desfeita.
			</p>

			<div class="mb-4">
				<label for="cancelReason" class="block text-sm font-medium text-gray-700 mb-2">
					Motivo do cancelamento *
				</label>
				<textarea 
					id="cancelReason"
					bind:value={cancelReason}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					rows="3"
					placeholder="Informe o motivo do cancelamento..."
					required
				></textarea>
			</div>

			<div class="flex gap-4 justify-end">
				<button 
					on:click={closeModal}
					class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
				>
					Cancelar
				</button>
				<button 
					on:click={handleCancelTransaction}
					class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
					disabled={$cashTransactions.loading || !cancelReason.trim()}
				>
					{$cashTransactions.loading ? 'Cancelando...' : 'Confirmar Cancelamento'}
				</button>
			</div>
		</div>
	</div>
{/if}