<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let employee: any;
	export let canEdit = false;

	function formatDate(dateString: string | null) {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleDateString('pt-BR');
	}

	function formatPhone(phone: string) {
		if (!phone) return '';
		return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
	}

	function formatDocument(doc: string) {
		if (!doc) return '';
		if (doc.length <= 11) {
			// CPF format
			return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
		} else {
			// CNPJ format
			return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
		}
	}

	function formatZipCode(zipCode: string) {
		if (!zipCode) return '';
		return zipCode.replace(/(\d{5})(\d{3})/, '$1-$2');
	}

	function handleClose() {
		dispatch('close');
	}

	function handleEdit() {
		dispatch('edit');
	}
</script>

<!-- Modal Backdrop -->
<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" on:click={handleClose}>
	<!-- Modal Container -->
	<div class="relative top-4 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white" on:click|stopPropagation>
		<!-- Modal Header -->
		<div class="flex justify-between items-start mb-6">
			<div>
				<h3 class="text-xl font-semibold text-gray-900">{employee.name}</h3>
				<div class="flex items-center mt-2 space-x-4">
					<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
						{employee.abbreviation}
					</span>
					<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {employee.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
						{employee.active ? 'Ativo' : 'Inativo'}
					</span>
				</div>
			</div>
			<div class="flex space-x-2">
				{#if canEdit}
					<button
						type="button"
						on:click={handleEdit}
						class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
					>
						Editar
					</button>
				{/if}
				<button
					type="button"
					on:click={handleClose}
					class="text-gray-400 hover:text-gray-600 focus:outline-none"
				>
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Employee Details -->
		<div class="space-y-6">
			<!-- Personal Information -->
			<div class="bg-gray-50 p-4 rounded-lg">
				<h4 class="text-md font-semibold text-gray-900 mb-4">Informações Pessoais</h4>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<dt class="text-sm font-medium text-gray-500">Nome Completo</dt>
						<dd class="mt-1 text-sm text-gray-900">{employee.name}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Email</dt>
						<dd class="mt-1 text-sm text-gray-900">
							<a href="mailto:{employee.email}" class="text-blue-600 hover:text-blue-900">
								{employee.email}
							</a>
						</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Telefone Principal</dt>
						<dd class="mt-1 text-sm text-gray-900">
							<a href="tel:{employee.phone}" class="text-blue-600 hover:text-blue-900">
								{formatPhone(employee.phone)}
							</a>
						</dd>
					</div>
					{#if employee.phone2}
						<div>
							<dt class="text-sm font-medium text-gray-500">Telefone Secundário</dt>
							<dd class="mt-1 text-sm text-gray-900">
								<a href="tel:{employee.phone2}" class="text-blue-600 hover:text-blue-900">
									{formatPhone(employee.phone2)}
								</a>
							</dd>
						</div>
					{/if}
					<div>
						<dt class="text-sm font-medium text-gray-500">CPF/CNPJ</dt>
						<dd class="mt-1 text-sm text-gray-900">{formatDocument(employee.documentNumber)}</dd>
					</div>
				</div>
			</div>

			<!-- Address Information -->
			<div class="bg-gray-50 p-4 rounded-lg">
				<h4 class="text-md font-semibold text-gray-900 mb-4">Endereço</h4>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="md:col-span-2">
						<dt class="text-sm font-medium text-gray-500">Endereço Completo</dt>
						<dd class="mt-1 text-sm text-gray-900">
							{employee.address}, {employee.number}
							{#if employee.complement}
								- {employee.complement}
							{/if}
						</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Bairro</dt>
						<dd class="mt-1 text-sm text-gray-900">{employee.neighborhood}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Cidade</dt>
						<dd class="mt-1 text-sm text-gray-900">{employee.city} - {employee.state}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">CEP</dt>
						<dd class="mt-1 text-sm text-gray-900">{formatZipCode(employee.zipCode)}</dd>
					</div>
				</div>
			</div>

			<!-- Job Information -->
			<div class="bg-gray-50 p-4 rounded-lg">
				<h4 class="text-md font-semibold text-gray-900 mb-4">Informações Profissionais</h4>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<dt class="text-sm font-medium text-gray-500">Função</dt>
						<dd class="mt-1 text-sm text-gray-900">{employee.position}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Data de Admissão</dt>
						<dd class="mt-1 text-sm text-gray-900">{formatDate(employee.hireDate)}</dd>
					</div>
					{#if employee.dismissalDate}
						<div>
							<dt class="text-sm font-medium text-gray-500">Data de Demissão</dt>
							<dd class="mt-1 text-sm text-gray-900">{formatDate(employee.dismissalDate)}</dd>
						</div>
					{/if}
				</div>
			</div>

			<!-- System Information -->
			<div class="bg-gray-50 p-4 rounded-lg">
				<h4 class="text-md font-semibold text-gray-900 mb-4">Informações do Sistema</h4>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<dt class="text-sm font-medium text-gray-500">Data de Cadastro</dt>
						<dd class="mt-1 text-sm text-gray-900">{formatDate(employee.createdAt)}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Última Atualização</dt>
						<dd class="mt-1 text-sm text-gray-900">{formatDate(employee.updatedAt)}</dd>
					</div>
				</div>
			</div>
		</div>

		<!-- Footer -->
		<div class="flex justify-end mt-6 pt-6 border-t border-gray-200">
			<button
				type="button"
				on:click={handleClose}
				class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
			>
				Fechar
			</button>
		</div>
	</div>
</div>