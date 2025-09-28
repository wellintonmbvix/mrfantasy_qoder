<script lang="ts">
  import { onMount } from 'svelte';
  import { auditLogs, auditLogActions } from '$lib/stores/auditLogs';
  import { auth } from '$lib/stores/auth';
  import type { AuditModule, AuditLogEntryWithUser } from '$lib/server/auditLog';

  // Estados reativos
  let showFilters = false;
  let showModal = false;
  let selectedLog: AuditLogEntryWithUser | null = null;
  
  // Filtros
  let localFilters = {
    startDate: '',
    endDate: '',
    module: '' as AuditModule | ''
  };

  // Labels para os módulos
  const moduleLabels: Record<AuditModule, string> = {
    'customers': 'Clientes',
    'employees': 'Funcionários',
    'orders': 'Pedidos',
    'products': 'Produtos',
    'users': 'Usuários',
    'cash-transactions': 'Transações de Caixa',
    'payment-methods': 'Métodos de Pagamento',
    'groups': 'Grupos de Produtos',
    'company': 'Empresa',
    'settings': 'Configurações'
  };

  // Labels para os tipos de ação
  const actionTypeLabels: Record<string, string> = {
    'CREATE': 'Criação',
    'UPDATE': 'Atualização',
    'DELETE': 'Exclusão'
  };

  // Permissões do usuário
  let canAccess = false;
  $: canAccess = $auth.user?.role === 'ADMIN';

  // Carregar dados iniciais
  onMount(() => {
    if (canAccess) {
      auditLogActions.fetchLogs();
    }
  });

  // Função para mudar de página
  function changePage(page: number) {
    auditLogActions.fetchLogs({
      page,
      limit: 20,
      startDate: localFilters.startDate || undefined,
      endDate: localFilters.endDate || undefined,
      module: localFilters.module || undefined
    });
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

  // Funções para filtros
  function applyFilters() {
    auditLogActions.fetchLogs({
      page: 1,
      limit: 20,
      startDate: localFilters.startDate || undefined,
      endDate: localFilters.endDate || undefined,
      module: localFilters.module || undefined
    });
  }

  function resetFilters() {
    localFilters = {
      startDate: '',
      endDate: '',
      module: ''
    };
    auditLogActions.fetchLogs();
  }

  // Função para formatar data
  function formatDateTime(date: string | Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  // Função para formatar dados JSON
  // function formatJsonData(data: any): string {
  //   if (!data) return '-';
  //   return JSON.stringify(data, null, 2);
  // }

  // Função para formatar dados JSON como campos individuais
  function formatDataAsFields(data: any): { key: string; value: any }[] {
    if (!data) return [];
    
    // Função recursiva para achatar objetos aninhados
    function flattenObject(obj: any, prefix = ''): { key: string; value: any }[] {
      const flattened: { key: string; value: any }[] = [];
      
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const newKey = prefix ? `${prefix}.${key}` : key;
          
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            // Se for um objeto, achatar recursivamente
            flattened.push(...flattenObject(obj[key], newKey));
          } else if (Array.isArray(obj[key])) {
            // Se for um array, mostrar como string
            flattened.push({ key: newKey, value: JSON.stringify(obj[key]) });
          } else {
            // Valor primitivo
            flattened.push({ key: newKey, value: obj[key] });
          }
        }
      }
      
      return flattened;
    }
    
    return flattenObject(data);
  }

  // Funções para o modal
  function openDetailsModal(log: AuditLogEntryWithUser) {
    selectedLog = log;
    showModal = true;
  }

  function closeDetailsModal() {
    showModal = false;
    selectedLog = null;
  }
</script>

<svelte:head>
  <title>Relatório de Auditoria - Mr. Fantasy</title>
</svelte:head>

{#if !canAccess}
  <div class="container mx-auto px-4 py-8">
    <div class="bg-red-50 border-l-4 border-red-500 p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-red-700">
            Acesso negado. Apenas administradores podem acessar este relatório.
          </p>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="container mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Relatório de Auditoria</h1>
      <button 
        on:click={() => showFilters = !showFilters}
        class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
      >
        {showFilters ? 'Ocultar Filtros' : 'Filtros'}
      </button>
    </div>

    <!-- Filtros -->
    {#if showFilters}
      <div class="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 class="text-lg font-semibold mb-4">Filtros</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div>
            <label for="filterModule" class="block text-sm font-medium text-gray-700 mb-2">
              Módulo
            </label>
            <select 
              id="filterModule"
              bind:value={localFilters.module}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os módulos</option>
              {#each Object.entries(moduleLabels) as [key, label]}
                <option value={key}>{label}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="flex gap-4 mt-4">
          <button 
            on:click={applyFilters}
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            disabled={$auditLogs.loading}
          >
            {$auditLogs.loading ? 'Filtrando...' : 'Aplicar Filtros'}
          </button>
          <button 
            on:click={resetFilters}
            class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            disabled={$auditLogs.loading}
          >
            Limpar Filtros
          </button>
        </div>
      </div>
    {/if}

    <!-- Loading -->
    {#if $auditLogs.loading}
      <div class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    {:else if $auditLogs.error}
      <div class="rounded-md bg-red-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-800">{$auditLogs.error}</p>
          </div>
        </div>
      </div>
    {:else if $auditLogs.logs.length === 0}
      <!-- Empty State -->
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0.621 0 1.125-.504 1.125-1.125V9.375c0-.621.504-1.125 1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">Nenhum log encontrado</h3>
        <p class="mt-1 text-sm text-gray-500">
          {localFilters.startDate || localFilters.endDate || localFilters.module 
            ? 'Tente ajustar os filtros de busca.' 
            : 'Ainda não há registros de auditoria.'}
        </p>
      </div>
    {:else}
      <!-- Lista de logs -->
      <div class="bg-white rounded-lg shadow-md overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data/Hora
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Módulo
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ação
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dados
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each $auditLogs.logs as log (log.id)}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {moduleLabels[log.module] || log.module}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    {#if log.actionType === 'CREATE'}
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {actionTypeLabels[log.actionType]}
                      </span>
                    {:else if log.actionType === 'UPDATE'}
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {actionTypeLabels[log.actionType]}
                      </span>
                    {:else}
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        {actionTypeLabels[log.actionType]}
                      </span>
                    {/if}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">{log.user.username}</div>
                    <div class="text-sm text-gray-500">{log.user.email}</div>
                  </td>
                  <td class="px-6 py-4">
                    <button 
                      on:click={() => openDetailsModal(log)}
                      class="text-blue-600 hover:text-blue-800 underline"
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        {#if $auditLogs.pagination && $auditLogs.pagination.pages > 1}
          <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div class="flex-1 flex justify-between sm:hidden">
              <button
                on:click={() => changePage(($auditLogs.pagination?.page || 1) - 1)}
                disabled={($auditLogs.pagination?.page || 1) <= 1 || $auditLogs.loading}
                class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                on:click={() => changePage(($auditLogs.pagination?.page || 1) + 1)}
                disabled={($auditLogs.pagination?.page || 1) >= ($auditLogs.pagination?.pages || 1) || $auditLogs.loading}
                class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo
              </button>
            </div>
            <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p class="text-sm text-gray-700">
                  Mostrando <span class="font-medium">{(($auditLogs.pagination?.page || 1) - 1) * ($auditLogs.pagination?.limit || 20) + 1}</span>
                  até <span class="font-medium">{Math.min((($auditLogs.pagination?.page || 1) * ($auditLogs.pagination?.limit || 20)), $auditLogs.pagination?.total || 0)}</span>
                  de <span class="font-medium">{$auditLogs.pagination?.total || 0}</span> resultados
                </p>
              </div>
              <div>
                <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    on:click={() => changePage(($auditLogs.pagination?.page || 1) - 1)}
                    disabled={($auditLogs.pagination?.page || 1) <= 1 || $auditLogs.loading}
                    class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span class="sr-only">Anterior</span>
                    <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </button>
                  
                  {#if $auditLogs.pagination?.pages && $auditLogs.pagination.pages <= 7}
                    <!-- Para 7 ou menos páginas, mostrar todas normalmente -->
                    {#each Array.from({ length: $auditLogs.pagination.pages }, (_, i) => i + 1) as pageNum}
                      {#if pageNum === ($auditLogs.pagination?.page || 1)}
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
                    {#each generatePageNumbers($auditLogs.pagination?.page || 1, $auditLogs.pagination?.pages || 1) as page}
                      {#if page === '...'}
                        <span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                          ...
                        </span>
                      {:else if page === ($auditLogs.pagination?.page || 1)}
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
                    on:click={() => changePage(($auditLogs.pagination?.page || 1) + 1)}
                    disabled={($auditLogs.pagination?.page || 1) >= ($auditLogs.pagination?.pages || 1) || $auditLogs.loading}
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

  <!-- Modal de Detalhes -->
  {#if showModal && selectedLog}
    <div class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <!-- Overlay -->
        <div 
          class="fixed inset-0 transition-opacity" 
          aria-hidden="true"
          on:click={closeDetailsModal}
        >
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <!-- Centralizar modal -->
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <!-- Conteúdo do Modal -->
        <div 
          class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
        >
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                  Detalhes do Log de Auditoria
                </h3>
                <div class="mt-4">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div class="bg-gray-50 p-4 rounded-lg">
                      <h4 class="font-medium text-gray-700 mb-2">Informações Básicas</h4>
                      <div class="space-y-2">
                        <div>
                          <span class="text-sm font-medium text-gray-500">Data/Hora:</span>
                          <p class="text-sm text-gray-900">{formatDateTime(selectedLog.timestamp)}</p>
                        </div>
                        <div>
                          <span class="text-sm font-medium text-gray-500">Módulo:</span>
                          <p class="text-sm text-gray-900">
                            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {moduleLabels[selectedLog.module] || selectedLog.module}
                            </span>
                          </p>
                        </div>
                        <div>
                          <span class="text-sm font-medium text-gray-500">Ação:</span>
                          <p class="text-sm text-gray-900">
                            {#if selectedLog.actionType === 'CREATE'}
                              <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                {actionTypeLabels[selectedLog.actionType]}
                              </span>
                            {:else if selectedLog.actionType === 'UPDATE'}
                              <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                {actionTypeLabels[selectedLog.actionType]}
                              </span>
                            {:else}
                              <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                {actionTypeLabels[selectedLog.actionType]}
                              </span>
                            {/if}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div class="bg-gray-50 p-4 rounded-lg">
                      <h4 class="font-medium text-gray-700 mb-2">Informações do Usuário</h4>
                      <div class="space-y-2">
                        <div>
                          <span class="text-sm font-medium text-gray-500">Nome:</span>
                          <p class="text-sm text-gray-900">{selectedLog.user.username}</p>
                        </div>
                        <div>
                          <span class="text-sm font-medium text-gray-500">Email:</span>
                          <p class="text-sm text-gray-900">{selectedLog.user.email}</p>
                        </div>
                        <div>
                          <span class="text-sm font-medium text-gray-500">ID:</span>
                          <p class="text-sm text-gray-900">{selectedLog.user.id}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 gap-4">
                    {#if selectedLog.originalData}
                      <div class="border border-gray-200 rounded-lg">
                        <div class="bg-gray-50 px-4 py-2 border-b border-gray-200">
                          <h4 class="font-medium text-gray-700">Dados Originais</h4>
                        </div>
                        <div class="p-4">
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {#each formatDataAsFields(selectedLog.originalData) as field}
                              <div class="border-b border-gray-100 pb-2">
                                <!-- svelte-ignore a11y_label_has_associated_control -->
                                <label class="text-xs font-medium text-gray-500 block">{field.key}</label>
                                <p class="text-sm text-gray-900 break-words">
                                  {field.value === null ? 'null' : 
                                   field.value === undefined ? 'undefined' : 
                                   field.value === '' ? '(vazio)' : 
                                   String(field.value)}
                                </p>
                              </div>
                            {/each}
                          </div>
                        </div>
                      </div>
                    {/if}
                    
                    {#if selectedLog.newData}
                      <div class="border border-gray-200 rounded-lg">
                        <div class="bg-gray-50 px-4 py-2 border-b border-gray-200">
                          <h4 class="font-medium text-gray-700">Novos Dados</h4>
                        </div>
                        <div class="p-4">
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {#each formatDataAsFields(selectedLog.newData) as field}
                              <div class="border-b border-gray-100 pb-2">
                                <!-- svelte-ignore a11y_label_has_associated_control -->
                                <label class="text-xs font-medium text-gray-500 block">{field.key}</label>
                                <p class="text-sm text-gray-900 break-words">
                                  {field.value === null ? 'null' : 
                                   field.value === undefined ? 'undefined' : 
                                   field.value === '' ? '(vazio)' : 
                                   String(field.value)}
                                </p>
                              </div>
                            {/each}
                          </div>
                        </div>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              on:click={closeDetailsModal}
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
{/if}