<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { employees } from '$lib/stores/employees.js';
	import { notificationStore } from '$lib/stores/notifications.js';
	import EmployeeForm from '$lib/components/EmployeeForm.svelte';
	import EmployeeDetails from '$lib/components/EmployeeDetails.svelte';

	export let data: any;

	let searchTerm = data.search || '';
	let loading = false;
	let showForm = false;
	let showDetails = false;
	let selectedEmployee: any = null;
	let editingEmployee: any = null;

	// Reactive variables from store
	$: employeeList = $employees.employees;
	$: pagination = $employees.pagination || { page: 1, limit: 10, total: 0, pages: 0 };
	$: currentPage = pagination.page;
	$: storeLoading = $employees.loading;
	$: error = $employees.error;

	// User permissions
	$: canManage = data.user.role === 'ADMIN' || data.user.role === 'MANAGER';

	onMount(() => {
		loadEmployees();
	});

	async function loadEmployees() {
		await employees.fetch({
			search: searchTerm,
			page: currentPage,
			limit: 10
		});
	}

	function handleSearch() {
		const url = new URL(window.location.href);
		url.searchParams.set('search', searchTerm);
		url.searchParams.set('page', '1');
		goto(url.toString());
		
		employees.fetch({
			search: searchTerm,
			page: 1,
			limit: 10
		});
	}

	function handlePageChange(newPage: number) {
		const url = new URL(window.location.href);
		url.searchParams.set('page', newPage.toString());
		goto(url.toString());
		
		employees.fetch({
			search: searchTerm,
			page: newPage,
			limit: 10
		});
	}

	function openCreateForm() {
		if (!canManage) return;
		editingEmployee = null;
		showForm = true;
	}

	function openEditForm(employee: any) {
		if (!canManage) return;
		editingEmployee = employee;
		showForm = true;
	}

	function openDetails(employee: any) {
		selectedEmployee = employee;
		showDetails = true;
	}

	function closeForm() {
		showForm = false;
		editingEmployee = null;
	}

	function closeDetails() {
		showDetails = false;
		selectedEmployee = null;
	}

	async function handleEmployeeSubmit(event: CustomEvent) {
		const { employee, isEdit } = event.detail;
		loading = true;

		try {
			let result;
			if (isEdit) {
				result = await employees.update(employee.id, employee);
			} else {
				result = await employees.create(employee);
			}

			if (result.success) {
				notificationStore.add({
					type: 'success',
					message: isEdit ? 'Funcionário atualizado com sucesso!' : 'Funcionário criado com sucesso!'
				});
				closeForm();
				loadEmployees();
			} else {
				notificationStore.add({
					type: 'error',
					message: result.error || 'Erro ao salvar funcionário'
				});
			}
		} catch (error) {
			notificationStore.add({
				type: 'error',
				message: 'Erro de conexão'
			});
		} finally {
			loading = false;
		}
	}

	async function deleteEmployee(employee: any) {
		if (!canManage) return;
		
		if (!confirm(`Tem certeza que deseja desativar o funcionário "${employee.name}"?`)) {
			return;
		}

		loading = true;
		try {
			const result = await employees.delete(employee.id);

			if (result.success) {
				notificationStore.add({
					type: 'success',
					message: 'Funcionário desativado com sucesso!'
				});
				loadEmployees();
			} else {
				notificationStore.add({
					type: 'error',
					message: result.error || 'Erro ao desativar funcionário'
				});
			}
		} catch (error) {
			notificationStore.add({
				type: 'error',
				message: 'Erro de conexão'
			});
		} finally {
			loading = false;
		}
	}

	function formatDate(dateString: string | null) {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleDateString('pt-BR');
	}

	function formatPhone(phone: string) {
		if (!phone) return '';
		return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
	}
</script>

<svelte:head>
	<title>Funcionários - mrfantasy</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex justify-between items-center">
			<div>
				<h1 class="text-3xl font-bold text-gray-900">Funcionários</h1>
				<p class="mt-2 text-gray-600">Gerencie os funcionários da empresa</p>
			</div>
			{#if canManage}
				<button
					type="button"
					on:click={openCreateForm}
					class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
					disabled={loading || storeLoading}
				>
					Novo Funcionário
				</button>
			{/if}
		</div>
	</div>

	<!-- Search Bar -->
	<div class="mb-6">
		<form on:submit|preventDefault={handleSearch} class="flex gap-4">
			<div class="flex-1">
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="Buscar por nome, email, telefone, documento..."
					class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>
			<button
				type="submit"
				class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
				disabled={loading || storeLoading}
			>
				Buscar
			</button>
		</form>
	</div>

	<!-- Error Message -->
	{#if error}
		<div class="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
			{error}
		</div>
	{/if}

	<!-- Loading State -->
	{#if storeLoading}
		<div class="flex justify-center items-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
		</div>
	{:else if employeeList.length === 0}
		<!-- Empty State -->
		<div class="text-center py-12">
			<div class="text-gray-500 text-lg">
				{searchTerm ? 'Nenhum funcionário encontrado com os critérios de busca.' : 'Nenhum funcionário cadastrado ainda.'}
			</div>
			{#if canManage && !searchTerm}
				<button
					type="button"
					on:click={openCreateForm}
					class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
				>
					Cadastrar Primeiro Funcionário
				</button>
			{/if}
		</div>
	{:else}
		<!-- Employee Table -->
		<div class="bg-white rounded-lg shadow overflow-hidden">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Nome
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Abreviatura
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Contato
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Função
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Admissão
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Status
							</th>
							<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
								Ações
							</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each employeeList as employee (employee.id)}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center">
										<div>
											<div class="text-sm font-medium text-gray-900">
												{employee.name}
											</div>
											<div class="text-sm text-gray-500">
												{employee.email}
											</div>
										</div>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
										{employee.abbreviation}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									<div>{formatPhone(employee.phone)}</div>
									{#if employee.phone2}
										<div class="text-gray-500">{formatPhone(employee.phone2)}</div>
									{/if}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{employee.position}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{formatDate(employee.hireDate)}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {employee.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
										{employee.active ? 'Ativo' : 'Inativo'}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
									<div class="flex items-center justify-end space-x-2">
										<!-- Visualizar -->
										<button
											type="button"
											on:click={() => openDetails(employee)}
											class="text-blue-600 hover:text-blue-900 transition-colors"
											title="Ver detalhes"
											aria-label="Ver detalhes do funcionário"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
											</svg>
										</button>
										{#if canManage}
											<!-- Editar -->
											<button
												type="button"
												on:click={() => openEditForm(employee)}
												class="text-indigo-600 hover:text-indigo-900 transition-colors"
												title="Editar funcionário"
												aria-label="Editar funcionário"
												disabled={loading}
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
												</svg>
											</button>
											{#if employee.active}
												<!-- Desativar -->
												<button
													type="button"
													on:click={() => deleteEmployee(employee)}
													class="text-red-600 hover:text-red-900 transition-colors"
													title="Desativar funcionário"
													aria-label="Desativar funcionário"
													disabled={loading}
												>
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
													</svg>
												</button>
											{/if}
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			{#if pagination.pages > 1}
				<div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
					<div class="flex-1 flex justify-between sm:hidden">
						<button
							on:click={() => handlePageChange(currentPage - 1)}
							disabled={currentPage <= 1}
							class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Anterior
						</button>
						<button
							on:click={() => handlePageChange(currentPage + 1)}
							disabled={currentPage >= pagination.pages}
							class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Próximo
						</button>
					</div>
					<div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
						<div>
							<p class="text-sm text-gray-700">
								Mostrando <span class="font-medium">{(currentPage - 1) * pagination.limit + 1}</span> a
								<span class="font-medium">{Math.min(currentPage * pagination.limit, pagination.total)}</span> de
								<span class="font-medium">{pagination.total}</span> funcionários
							</p>
						</div>
						<div>
							<nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
								<button
									on:click={() => handlePageChange(currentPage - 1)}
									disabled={currentPage <= 1}
									class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<span class="sr-only">Anterior</span>
									<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
									</svg>
								</button>

								{#each Array(pagination.pages) as _, i}
									{@const pageNum = i + 1}
									<button
										on:click={() => handlePageChange(pageNum)}
										class="relative inline-flex items-center px-4 py-2 border text-sm font-medium {pageNum === currentPage 
											? 'z-10 bg-blue-50 border-blue-500 text-blue-600' 
											: 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}"
									>
										{pageNum}
									</button>
								{/each}

								<button
									on:click={() => handlePageChange(currentPage + 1)}
									disabled={currentPage >= pagination.pages}
									class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<span class="sr-only">Próximo</span>
									<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
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

<!-- Employee Form Modal -->
{#if showForm}
	{#key editingEmployee?.id || 'new'}
		<EmployeeForm
			employee={editingEmployee}
			on:submit={handleEmployeeSubmit}
			on:cancel={closeForm}
		/>
	{/key}
{/if}

<!-- Employee Details Modal -->
{#if showDetails && selectedEmployee}
	<EmployeeDetails
		employee={selectedEmployee}
		on:close={closeDetails}
		on:edit={() => {
			const employeeToEdit = selectedEmployee; // Guardar referência antes de limpar
			closeDetails();
			openEditForm(employeeToEdit);
		}}
		canEdit={canManage}
	/>
{/if}