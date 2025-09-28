<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { uiStore } from '$lib/stores/userUI.js';
	import { ui } from '$lib/stores/ui.js';
	import { notificationStore } from '$lib/stores/notifications.js';
	import UserForm from '$lib/components/UserForm.svelte';
	import DeleteConfirmModal from '$lib/components/DeleteConfirmModal.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let searchTerm = data.search || '';
	let loading = false;
	let users = data.users || [];
	let pagination = data.pagination || { page: 1, limit: 10, total: 0, pages: 0 };
	let deleteUserId: number | null = null;
	
	// Reactive declarations
	let currentPage: number;
	let uiState: any;
	let deleteUser: any;
	
	$: {
		currentPage = pagination.page;
		uiState = $ui;
		deleteUser = deleteUserId ? users.find((u: any) => u.id === deleteUserId) : null;
	}

	onMount(() => {
		// Subscribe to UI store for modal state
		uiStore.subscribe(state => {
			if (!state.userForm.show) {
				// Refresh data when modal closes
				refreshData();
			}
		});
	});

	async function refreshData() {
		loading = true;
		try {
			const url = new URL(window.location.href);
			url.searchParams.set('search', searchTerm);
			url.searchParams.set('page', currentPage.toString());

			const response = await fetch(`/api/users?${url.searchParams.toString()}`);
			if (response.ok) {
				const data = await response.json();
				users = data.users;
				pagination = data.pagination;
			}
		} catch (error) {
			console.error('Error refreshing data:', error);
		} finally {
			loading = false;
		}
	}

	function handleSearch() {
		const url = new URL(window.location.href);
		url.searchParams.set('search', searchTerm);
		url.searchParams.set('page', '1');
		goto(url.toString());
	}

	function handlePageChange(newPage: number) {
		const url = new URL(window.location.href);
		url.searchParams.set('page', newPage.toString());
		goto(url.toString());
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

	function openCreateModal() {
		uiStore.openUserForm();
	}

	function openEditModal(user: any) {
		uiStore.openUserForm(user);
	}

	function openDeleteModal(userId: number) {
		deleteUserId = userId;
		ui.openModal('deleteConfirm');
	}

	async function handleUserSubmit(event: CustomEvent) {
		const { user, isEdit } = event.detail;
		loading = true;

		try {
			const url = isEdit ? `/api/users/${user.id}` : '/api/users';
			const method = isEdit ? 'PUT' : 'POST';

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(user)
			});

			const result = await response.json();

			if (response.ok) {
				notificationStore.add({
					type: 'success',
					message: isEdit ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!'
				});
				
				uiStore.closeUserForm();
				
				refreshData();
			} else {
				notificationStore.add({
					type: 'error',
					message: result.error || 'Erro ao salvar usuário'
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

	function handleUserCancel() {
		uiStore.closeUserForm();
	}

	async function toggleUserStatus(user: any) {
		if (loading) return;
		
		loading = true;
		try {
			const response = await fetch(`/api/users/${user.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ active: !user.active })
			});

			const result = await response.json();

			if (response.ok) {
				notificationStore.add({
					type: 'success',
					message: `Usuário ${user.active ? 'desativado' : 'ativado'} com sucesso!`
				});
				refreshData();
			} else {
				notificationStore.add({
					type: 'error',
					message: result.error || 'Erro ao alterar status do usuário'
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

	async function handleDelete() {
		if (deleteUserId) {
			loading = true;
			try {
				const response = await fetch(`/api/users/${deleteUserId}`, {
					method: 'DELETE'
				});

				const result = await response.json();

				if (response.ok) {
					notificationStore.add({
						type: 'success',
						message: 'Usuário excluído com sucesso!'
					});
					ui.closeModal('deleteConfirm');
					refreshData();
				} else {
					notificationStore.add({
						type: 'error',
						message: result.error || 'Erro ao excluir usuário'
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
		deleteUserId = null;
	}

	function getRoleBadgeClass(role: string) {
		switch (role) {
			case 'ADMIN':
				return 'bg-red-100 text-red-800';
			case 'MANAGER':
				return 'bg-blue-100 text-blue-800';
			case 'EMPLOYEE':
				return 'bg-green-100 text-green-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	function getRoleLabel(role: string) {
		switch (role) {
			case 'ADMIN':
				return 'Administrador';
			case 'MANAGER':
				return 'Gerente';
			case 'EMPLOYEE':
				return 'Funcionário';
			default:
				return role;
		}
	}
</script>

<svelte:head>
	<title>Usuários - Mr. Fantasy</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Usuários</h1>
			<p class="text-gray-600 mt-1">Gerencie os usuários do sistema</p>
		</div>
		<button
			on:click={openCreateModal}
			class="btn btn-primary"
			disabled={loading}
		>
			<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
			</svg>
			Novo Usuário
		</button>
	</div>

	<!-- Search -->
	<div class="flex flex-col sm:flex-row gap-4">
		<div class="flex-1">
			<div class="relative">
				<input
					type="text"
					bind:value={searchTerm}
					on:keydown={(e) => e.key === 'Enter' && handleSearch()}
					placeholder="Buscar usuários por nome ou email..."
					class="form-input pl-10"
				/>
				<svg class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</div>
		</div>
		<button
			on:click={handleSearch}
			class="btn btn-secondary"
			disabled={loading}
		>
			Buscar
		</button>
	</div>

	<!-- Users Table -->
	<div class="bg-white shadow-sm rounded-lg overflow-hidden">
		{#if loading}
			<div class="flex items-center justify-center p-8">
				<svg class="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
			</div>
		{:else if users.length === 0}
			<div class="text-center py-12">
				<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
				</svg>
				<h3 class="mt-2 text-sm font-medium text-gray-900">Nenhum usuário encontrado</h3>
				<p class="mt-1 text-sm text-gray-500">
					{searchTerm ? 'Tente ajustar os filtros de busca.' : 'Comece criando um novo usuário.'}
				</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Usuário
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Email
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Papel
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Status
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Criado em
							</th>
							<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
								Ações
							</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each users as user (user.id)}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">{user.username}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm text-gray-900">{user.email}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getRoleBadgeClass(user.role)}">
										{getRoleLabel(user.role)}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
										{user.active ? 'Ativo' : 'Inativo'}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{new Date(user.createdAt).toLocaleDateString('pt-BR')}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
									<div class="flex items-center justify-end space-x-2">
										<!-- svelte-ignore a11y_consider_explicit_label -->
										<button
											on:click={() => openEditModal(user)}
											class="text-blue-600 hover:text-blue-900 transition-colors"
											title="Editar usuário"
											disabled={loading}
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
										</button>
										<button
											on:click={() => toggleUserStatus(user)}
											class="{user.active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'} transition-colors"
											title="{user.active ? 'Desativar' : 'Ativar'} usuário"
											disabled={loading}
										>
											{#if user.active}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
												</svg>
											{:else}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
												</svg>
											{/if}
										</button>
										<!-- svelte-ignore a11y_consider_explicit_label -->
										<button
											on:click={() => openDeleteModal(user.id)}
											class="text-red-600 hover:text-red-900 transition-colors"
											title="Excluir usuário"
											disabled={loading}
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
			{#if pagination.pages > 1}
				<div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
					<div class="flex-1 flex justify-between sm:hidden">
						<button
							on:click={() => handlePageChange(currentPage - 1)}
							disabled={currentPage <= 1}
							class="btn btn-secondary btn-sm"
						>
							Anterior
						</button>
						<button
							on:click={() => handlePageChange(currentPage + 1)}
							disabled={currentPage >= pagination.pages}
							class="btn btn-secondary btn-sm"
						>
							Próximo
						</button>
					</div>
					<div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
						<div>
							<p class="text-sm text-gray-700">
								Mostrando
								<span class="font-medium">{(currentPage - 1) * pagination.limit + 1}</span>
								a
								<span class="font-medium">{Math.min(currentPage * pagination.limit, pagination.total)}</span>
								de
								<span class="font-medium">{pagination.total}</span>
								resultados
							</p>
						</div>
						<div>
							<nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
								<!-- Previous Button -->
								<!-- svelte-ignore a11y_consider_explicit_label -->
								<button
									on:click={() => handlePageChange(currentPage - 1)}
									disabled={currentPage <= 1}
									class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
								>
									<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
									</svg>
								</button>

								<!-- Page Numbers -->
								{#each generatePageNumbers(currentPage, pagination.pages) as page}
									{#if page === '...'}
										<span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
											...
										</span>
									{:else}
										<button
											on:click={() => handlePageChange(page as number)}
											class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 {page === currentPage ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : ''}"
										>
											{page}
										</button>
									{/if}
								{/each}

								<!-- Next Button -->
								<!-- svelte-ignore a11y_consider_explicit_label -->
								<button
									on:click={() => handlePageChange(currentPage + 1)}
									disabled={currentPage >= pagination.pages}
									class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
								>
									<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
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
</div>

<!-- User Form Modal -->
{#if $uiStore.userForm.show}
	<UserForm
		user={$uiStore.userForm.user}
		on:submit={handleUserSubmit}
		on:cancel={handleUserCancel}
	/>
{/if}

<!-- Delete Confirmation Modal -->
{#if uiState.modals.deleteConfirm}
	<DeleteConfirmModal
		title="Excluir Usuário"
		message={deleteUser ? `Tem certeza que deseja excluir o usuário "${deleteUser.username}"? Esta ação não pode ser desfeita.` : 'Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.'}
		loading={loading}
		on:confirm={handleDelete}
		on:cancel={() => ui.closeModal('deleteConfirm')}
	/>
{/if}