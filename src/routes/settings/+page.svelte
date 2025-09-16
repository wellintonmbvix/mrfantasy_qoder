<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	export let data: any;
	export let form: any;

	// Estados dos campos
	let formData = {
		databaseVersion: 1,
		receiptInBobina: false,
		inhibitSurcharge: false,
		allowNegativeStock: false
	};

	type FormDataType = typeof formData;

	// Atualizar formData quando os dados mudarem
	$: if (data.settings) {
		formData = {
			databaseVersion: data.settings.databaseVersion || 1,
			receiptInBobina: data.settings.receiptInBobina || false,
			inhibitSurcharge: data.settings.inhibitSurcharge || false,
			allowNegativeStock: data.settings.allowNegativeStock || false
		};
	}

	// Atualizar dados quando form retorna sucesso
	$: if (form?.success && form?.settings) {
		// Atualizar data.settings com os dados salvos
		data.settings = form.settings;
		formData = {
			databaseVersion: form.settings.databaseVersion || 1,
			receiptInBobina: form.settings.receiptInBobina || false,
			inhibitSurcharge: form.settings.inhibitSurcharge || false,
			allowNegativeStock: form.settings.allowNegativeStock || false
		};
	}

	let isSubmitting = false;
</script>

<svelte:head>
	<title>Configurações do Sistema - Mr Fantasy</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-3xl font-bold text-gray-900">
			Configurações do Sistema
		</h1>
	</div>

	<!-- Mensagens -->
	{#if form?.success}
		<div class="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
			{form.message}
		</div>
	{/if}

	{#if form?.message && !form?.success}
		<div class="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
			{form.message}
		</div>
	{/if}

	<div class="bg-white rounded-lg shadow-md p-6">
		<form method="POST" action="?/save" use:enhance={() => {
			isSubmitting = true;
			return async ({ update, result }) => {
				await update();
				if (result.type === 'success') {
					// Recarregar dados da página
					await invalidateAll();
				}
				isSubmitting = false;
			};
		}}>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<!-- Versão do Banco de Dados -->
				<div class="md:col-span-2">
					<label for="databaseVersion" class="block text-sm font-medium text-gray-700 mb-2">
						Versão do Banco de Dados *
					</label>
					<input
						type="number"
						id="databaseVersion"
						name="databaseVersion"
						bind:value={formData.databaseVersion}
						min="1"
						max="999999"
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						class:border-red-500={form?.errors?.databaseVersion}
					/>
					{#if form?.errors?.databaseVersion}
						<p class="mt-1 text-sm text-red-600">{form.errors.databaseVersion}</p>
					{/if}
					<p class="mt-1 text-sm text-gray-500">
						Número que identifica a versão atual do banco de dados do sistema
					</p>
				</div>

				<!-- Comprovante em Bobina -->
				<div class="md:col-span-2">
					<div class="flex items-center">
						<input
							type="checkbox"
							id="receiptInBobina"
							name="receiptInBobina"
							bind:checked={formData.receiptInBobina}
							class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
						/>
						<label for="receiptInBobina" class="ml-2 block text-sm font-medium text-gray-700">
							Comprovante em Bobina
						</label>
					</div>
					<p class="mt-1 text-sm text-gray-500">
						Habilita a impressão de comprovantes em formato bobina (papel térmico)
					</p>
				</div>

				<!-- Inibir Acréscimo -->
				<div class="md:col-span-2">
					<div class="flex items-center">
						<input
							type="checkbox"
							id="inhibitSurcharge"
							name="inhibitSurcharge"
							bind:checked={formData.inhibitSurcharge}
							class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
						/>
						<label for="inhibitSurcharge" class="ml-2 block text-sm font-medium text-gray-700">
							Inibir Acréscimo
						</label>
					</div>
					<p class="mt-1 text-sm text-gray-500">
						Impede a aplicação de acréscimos automáticos em pedidos e aluguéis
					</p>
				</div>

				<!-- Permitir Estoque Negativo -->
				<div class="md:col-span-2">
					<div class="flex items-center">
						<input
							type="checkbox"
							id="allowNegativeStock"
							name="allowNegativeStock"
							bind:checked={formData.allowNegativeStock}
							class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
						/>
						<label for="allowNegativeStock" class="ml-2 block text-sm font-medium text-gray-700">
							Permitir Estoque Negativo
						</label>
					</div>
					<p class="mt-1 text-sm text-gray-500">
						Permite a venda ou aluguel de itens mesmo com estoque zero ou negativo
					</p>
				</div>
			</div>

			<!-- Botões -->
			<div class="mt-8 flex justify-end space-x-4">
				<a 
					href="/dashboard" 
					class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					Cancelar
				</a>
				<button
					type="submit"
					disabled={isSubmitting}
					class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if isSubmitting}
						Salvando...
					{:else}
						Salvar Configurações
					{/if}
				</button>
			</div>
		</form>
	</div>

	<!-- Informações Adicionais -->
	<div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
		<h3 class="text-lg font-semibold text-blue-900 mb-2">Informações Importantes</h3>
		<ul class="list-disc list-inside text-sm text-blue-800 space-y-1">
			<li><strong>Versão do Banco de Dados:</strong> Controla a compatibilidade entre diferentes versões do sistema</li>
			<li><strong>Comprovante em Bobina:</strong> Ajusta o formato de impressão para impressoras térmicas de bobina</li>
			<li><strong>Inibir Acréscimo:</strong> Previne a cobrança automática de taxas extras em transações</li>
			<li><strong>Permitir Estoque Negativo:</strong> Habilita vendas e aluguéis mesmo quando o estoque está zerado ou negativo</li>
			<li><strong>Acesso:</strong> Estas configurações só podem ser alteradas por Administradores e Gerentes</li>
		</ul>
	</div>
</div>