<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { formatCNPJ, formatCEP } from '$lib/utils/validation';

	export let data: any;
	export let form: any;

	// Estados dos campos
	let formData = {
		razaoSocial: '',
		nomeFantasia: '',
		endereco: '',
		numero: '',
		complemento: '',
		bairro: '',
		cidade: '',
		estado: '',
		cep: '',
		telefone1: '',
		telefone2: '',
		cnpj: '',
		inscricaoEstadual: '',
		observacaoAluguel: ''
	};

	// Atualizar formData quando os dados mudarem
	$: if (data.company) {
		formData = {
			razaoSocial: data.company.razaoSocial || '',
			nomeFantasia: data.company.nomeFantasia || '',
			endereco: data.company.endereco || '',
			numero: data.company.numero || '',
			complemento: data.company.complemento || '',
			bairro: data.company.bairro || '',
			cidade: data.company.cidade || '',
			estado: data.company.estado || '',
			cep: data.company.cep || '',
			telefone1: data.company.telefone1 || '',
			telefone2: data.company.telefone2 || '',
			cnpj: data.company.cnpj || '',
			inscricaoEstadual: data.company.inscricaoEstadual || '',
			observacaoAluguel: data.company.observacaoAluguel || ''
		};
	}

	// Atualizar dados quando form retorna sucesso
	$: if (form?.success && form?.company) {
		// Atualizar data.company com os dados salvos
		data.company = form.company;
		formData = {
			razaoSocial: form.company.razaoSocial || '',
			nomeFantasia: form.company.nomeFantasia || '',
			endereco: form.company.endereco || '',
			numero: form.company.numero || '',
			complemento: form.company.complemento || '',
			bairro: form.company.bairro || '',
			cidade: form.company.cidade || '',
			estado: form.company.estado || '',
			cep: form.company.cep || '',
			telefone1: form.company.telefone1 || '',
			telefone2: form.company.telefone2 || '',
			cnpj: form.company.cnpj || '',
			inscricaoEstadual: form.company.inscricaoEstadual || '',
			observacaoAluguel: form.company.observacaoAluguel || ''
		};
	}

	let isSubmitting = false;

	// Função para atualizar campo no formData
	function updateField(field: string, value: string) {
		formData[field as keyof typeof formData] = value;
	}

	// Formatação automática de campos
	function handleCNPJInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const formatted = formatCNPJ(target.value);
		target.value = formatted;
		formData.cnpj = formatted;
	}

	function handleCEPInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const formatted = formatCEP(target.value);
		target.value = formatted;
		formData.cep = formatted;
	}

	function handlePhoneInput(event: Event, field: 'telefone1' | 'telefone2') {
		const target = event.target as HTMLInputElement;
		let value = target.value.replace(/\D/g, '');
		
		if (value.length <= 11) {
			if (value.length <= 10) {
				value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
			} else {
				value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
			}
		}
		
		target.value = value;
		formData[field] = value;
	}

	// Estados brasileiros
	const estados = [
		'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
		'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
		'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
	];
</script>

<svelte:head>
	<title>Dados da Empresa - Mr Fantasy</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-3xl font-bold text-gray-900">
			{data.company ? 'Editar' : 'Cadastrar'} Dados da Empresa
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
				<!-- Razão Social -->
				<div class="md:col-span-2">
					<label for="razaoSocial" class="block text-sm font-medium text-gray-700 mb-2">
						Razão Social *
					</label>
					<input
						type="text"
						id="razaoSocial"
						name="razaoSocial"
						bind:value={formData.razaoSocial}
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						class:border-red-500={form?.errors?.razaoSocial}
					/>
					{#if form?.errors?.razaoSocial}
						<p class="mt-1 text-sm text-red-600">{form.errors.razaoSocial}</p>
					{/if}
				</div>

				<!-- Nome Fantasia -->
				<div class="md:col-span-2">
					<label for="nomeFantasia" class="block text-sm font-medium text-gray-700 mb-2">
						Nome Fantasia *
					</label>
					<input
						type="text"
						id="nomeFantasia"
						name="nomeFantasia"
						bind:value={formData.nomeFantasia}
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						class:border-red-500={form?.errors?.nomeFantasia}
					/>
					{#if form?.errors?.nomeFantasia}
						<p class="mt-1 text-sm text-red-600">{form.errors.nomeFantasia}</p>
					{/if}
				</div>

				<!-- Endereço -->
				<div class="md:col-span-2">
					<label for="endereco" class="block text-sm font-medium text-gray-700 mb-2">
						Endereço *
					</label>
					<input
						type="text"
						id="endereco"
						name="endereco"
						bind:value={formData.endereco}
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						class:border-red-500={form?.errors?.endereco}
					/>
					{#if form?.errors?.endereco}
						<p class="mt-1 text-sm text-red-600">{form.errors.endereco}</p>
					{/if}
				</div>

				<!-- Número -->
				<div>
					<label for="numero" class="block text-sm font-medium text-gray-700 mb-2">
						Número *
					</label>
					<input
						type="text"
						id="numero"
						name="numero"
						bind:value={formData.numero}
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						class:border-red-500={form?.errors?.numero}
					/>
					{#if form?.errors?.numero}
						<p class="mt-1 text-sm text-red-600">{form.errors.numero}</p>
					{/if}
				</div>

				<!-- Complemento -->
				<div>
					<label for="complemento" class="block text-sm font-medium text-gray-700 mb-2">
						Complemento
					</label>
					<input
						type="text"
						id="complemento"
						name="complemento"
						bind:value={formData.complemento}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						class:border-red-500={form?.errors?.complemento}
					/>
					{#if form?.errors?.complemento}
						<p class="mt-1 text-sm text-red-600">{form.errors.complemento}</p>
					{/if}
				</div>

				<!-- Bairro -->
				<div>
					<label for="bairro" class="block text-sm font-medium text-gray-700 mb-2">
						Bairro *
					</label>
					<input
						type="text"
						id="bairro"
						name="bairro"
						bind:value={formData.bairro}
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						class:border-red-500={form?.errors?.bairro}
					/>
					{#if form?.errors?.bairro}
						<p class="mt-1 text-sm text-red-600">{form.errors.bairro}</p>
					{/if}
				</div>

				<!-- Cidade -->
				<div>
					<label for="cidade" class="block text-sm font-medium text-gray-700 mb-2">
						Cidade *
					</label>
					<input
						type="text"
						id="cidade"
						name="cidade"
						bind:value={formData.cidade}
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						class:border-red-500={form?.errors?.cidade}
					/>
					{#if form?.errors?.cidade}
						<p class="mt-1 text-sm text-red-600">{form.errors.cidade}</p>
					{/if}
				</div>

				<!-- Estado -->
				<div>
					<label for="estado" class="block text-sm font-medium text-gray-700 mb-2">
						Estado *
					</label>
					<select
						id="estado"
						name="estado"
						bind:value={formData.estado}
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						class:border-red-500={form?.errors?.estado}
					>
						<option value="">Selecione o estado</option>
						{#each estados as estado}
							<option value={estado}>{estado}</option>
						{/each}
					</select>
					{#if form?.errors?.estado}
						<p class="mt-1 text-sm text-red-600">{form.errors.estado}</p>
					{/if}
				</div>

				<!-- CEP -->
				<div>
					<label for="cep" class="block text-sm font-medium text-gray-700 mb-2">
						CEP *
					</label>
					<input
						type="text"
						id="cep"
						name="cep"
						bind:value={formData.cep}
						on:input={handleCEPInput}
						placeholder="00000-000"
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						class:border-red-500={form?.errors?.cep}
					/>
					{#if form?.errors?.cep}
						<p class="mt-1 text-sm text-red-600">{form.errors.cep}</p>
					{/if}
				</div>

				<!-- Telefone 1 -->
				<div>
					<label for="telefone1" class="block text-sm font-medium text-gray-700 mb-2">
						Telefone 1 *
					</label>
					<input
						type="text"
						id="telefone1"
						name="telefone1"
						bind:value={formData.telefone1}
						on:input={(e) => handlePhoneInput(e, 'telefone1')}
						placeholder="(00) 00000-0000"
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						class:border-red-500={form?.errors?.telefone1}
					/>
					{#if form?.errors?.telefone1}
						<p class="mt-1 text-sm text-red-600">{form.errors.telefone1}</p>
					{/if}
				</div>

				<!-- Telefone 2 -->
				<div>
					<label for="telefone2" class="block text-sm font-medium text-gray-700 mb-2">
						Telefone 2
					</label>
					<input
						type="text"
						id="telefone2"
						name="telefone2"
						bind:value={formData.telefone2}
						on:input={(e) => handlePhoneInput(e, 'telefone2')}
						placeholder="(00) 00000-0000"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						class:border-red-500={form?.errors?.telefone2}
					/>
					{#if form?.errors?.telefone2}
						<p class="mt-1 text-sm text-red-600">{form.errors.telefone2}</p>
					{/if}
				</div>

				<!-- CNPJ -->
				<div>
					<label for="cnpj" class="block text-sm font-medium text-gray-700 mb-2">
						CNPJ *
					</label>
					<input
						type="text"
						id="cnpj"
						name="cnpj"
						bind:value={formData.cnpj}
						on:input={handleCNPJInput}
						placeholder="00.000.000/0000-00"
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						class:border-red-500={form?.errors?.cnpj}
					/>
					{#if form?.errors?.cnpj}
						<p class="mt-1 text-sm text-red-600">{form.errors.cnpj}</p>
					{/if}
				</div>

				<!-- Inscrição Estadual -->
				<div>
					<label for="inscricaoEstadual" class="block text-sm font-medium text-gray-700 mb-2">
						Inscrição Estadual
					</label>
					<input
						type="text"
						id="inscricaoEstadual"
						name="inscricaoEstadual"
						bind:value={formData.inscricaoEstadual}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						class:border-red-500={form?.errors?.inscricaoEstadual}
					/>
					{#if form?.errors?.inscricaoEstadual}
						<p class="mt-1 text-sm text-red-600">{form.errors.inscricaoEstadual}</p>
					{/if}
				</div>

				<!-- Observação de Aluguel -->
				<div class="md:col-span-2">
					<label for="observacaoAluguel" class="block text-sm font-medium text-gray-700 mb-2">
						Observação de Aluguel
					</label>
					<textarea
						id="observacaoAluguel"
						name="observacaoAluguel"
						bind:value={formData.observacaoAluguel}
						rows="4"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						class:border-red-500={form?.errors?.observacaoAluguel}
						placeholder="Observações sobre políticas de aluguel, condições especiais, etc."
					></textarea>
					{#if form?.errors?.observacaoAluguel}
						<p class="mt-1 text-sm text-red-600">{form.errors.observacaoAluguel}</p>
					{/if}
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
						{data.company ? 'Atualizar' : 'Salvar'} Dados
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>