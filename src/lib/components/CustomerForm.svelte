<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { z } from 'zod';

	const dispatch = createEventDispatcher();

	export let customer: any = null;

	$: isEdit = !!customer;

	// Form data - reativo para atualizar quando customer mudar
	$: formData = {
		name: customer?.name || '',
		email: customer?.email || '',
		phone: customer?.phone || '',
		phone2: customer?.phone2 || '',
		address: customer?.address || '',
		number: customer?.number || '',
		complement: customer?.complement || '',
		neighborhood: customer?.neighborhood || '',
		city: customer?.city || '',
		state: customer?.state || '',
		zipCode: customer?.zipCode || '',
		documentNumber: customer?.documentNumber || ''
	};

	// Validation schema
	const CustomerSchema = z.object({
		name: z.string().min(1, 'Nome é obrigatório'),
		email: z.string().email('Email inválido'),
		phone: z.string().min(1, 'Telefone é obrigatório'),
		phone2: z.string().optional(),
		address: z.string().min(1, 'Endereço é obrigatório'),
		number: z.string().min(1, 'Número é obrigatório'),
		complement: z.string().optional(),
		neighborhood: z.string().min(1, 'Bairro é obrigatório'),
		city: z.string().min(1, 'Cidade é obrigatória'),
		state: z.string().min(1, 'Estado é obrigatório'),
		zipCode: z.string().min(1, 'CEP é obrigatório'),
		documentNumber: z.string().min(1, 'Documento é obrigatório')
	});

	let errors: Record<string, string> = {};
	let loading = false;

	function validateField(field: string, value: any) {
		// Simple validation for now - just check required fields
		const requiredFields = ['name', 'email', 'phone', 'address', 'number', 'neighborhood', 'city', 'state', 'zipCode', 'documentNumber'];
		
		if (requiredFields.includes(field) && (!value || value.trim() === '')) {
			errors[field] = 'Este campo é obrigatório';
			errors = { ...errors };
		} else {
			delete errors[field];
			errors = { ...errors };
		}
	}

	function handleSubmit() {
		// Reset errors
		errors = {};

		// Validate form data
		const validation = CustomerSchema.safeParse(formData);

		if (!validation.success) {
			validation.error.errors.forEach(error => {
				errors[error.path[0] as string] = error.message;
			});
			errors = { ...errors };
			return;
		}

		loading = true;

		// Prepare data for submission
		const submitData: any = {
			...formData,
			id: customer?.id
		};

		// Convert empty strings to null for optional fields
		if (!submitData.phone2) submitData.phone2 = null;
		if (!submitData.complement) submitData.complement = null;

		dispatch('submit', {
			customer: submitData,
			isEdit
		});

		loading = false;
	}

	function handleCancel() {
		dispatch('cancel');
	}

	// Format phone number as user types
	function formatPhone(event: Event) {
		const target = event.target as HTMLInputElement;
		let value = target.value.replace(/\D/g, '');
		
		if (value.length <= 10) {
			value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
		} else {
			value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
		}
		
		target.value = value;
	}

	// Format CEP as user types
	function formatZipCode(event: Event) {
		const target = event.target as HTMLInputElement;
		let value = target.value.replace(/\D/g, '');
		value = value.replace(/(\d{5})(\d{3})/, '$1-$2');
		target.value = value;
	}

	// Format document number as user types
	function formatDocument(event: Event) {
		const target = event.target as HTMLInputElement;
		let value = target.value.replace(/\D/g, '');
		
		if (value.length <= 11) {
			// CPF format
			value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
		} else {
			// CNPJ format
			value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
		}
		
		target.value = value;
	}

	// Brazilian states
	const brazilianStates = [
		'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
		'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
		'SP', 'SE', 'TO'
	];
</script>

<!-- Modal Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" on:click={handleCancel}>
	<!-- Modal Container -->
	<div class="relative top-4 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white" on:click|stopPropagation>
		<!-- Modal Header -->
		<div class="mb-6">
			<h3 class="text-lg font-medium text-gray-900">
				{isEdit ? 'Editar Cliente' : 'Novo Cliente'}
			</h3>
			<p class="mt-1 text-sm text-gray-600">
				{isEdit ? 'Altere os dados do cliente abaixo.' : 'Preencha os dados do novo cliente.'}
			</p>
		</div>

		<!-- Form -->
		<form on:submit|preventDefault={handleSubmit} class="space-y-6">
			<!-- Personal Information -->
			<div class="bg-gray-50 p-4 rounded-lg">
				<h4 class="text-md font-medium text-gray-900 mb-4">Informações Pessoais</h4>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<!-- Name -->
					<div class="md:col-span-2">
						<label for="name" class="block text-sm font-medium text-gray-700">Nome Completo *</label>
						<input
							type="text"
							id="name"
							bind:value={formData.name}
							on:blur={() => validateField('name', formData.name)}
							class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 {errors.name ? 'border-red-300' : ''}"
							placeholder="Digite o nome completo"
						/>
						{#if errors.name}
							<p class="mt-1 text-sm text-red-600">{errors.name}</p>
						{/if}
					</div>

					<!-- Email -->
					<div>
						<label for="email" class="block text-sm font-medium text-gray-700">Email *</label>
						<input
							type="email"
							id="email"
							bind:value={formData.email}
							on:blur={() => validateField('email', formData.email)}
							class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 {errors.email ? 'border-red-300' : ''}"
							placeholder="email@exemplo.com"
						/>
						{#if errors.email}
							<p class="mt-1 text-sm text-red-600">{errors.email}</p>
						{/if}
					</div>

					<!-- Document Number -->
					<div>
						<label for="documentNumber" class="block text-sm font-medium text-gray-700">CPF/CNPJ *</label>
						<input
							type="text"
							id="documentNumber"
							bind:value={formData.documentNumber}
							on:input={formatDocument}
							on:blur={() => validateField('documentNumber', formData.documentNumber)}
							class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 {errors.documentNumber ? 'border-red-300' : ''}"
							placeholder="000.000.000-00"
						/>
						{#if errors.documentNumber}
							<p class="mt-1 text-sm text-red-600">{errors.documentNumber}</p>
						{/if}
					</div>

					<!-- Phone -->
					<div>
						<label for="phone" class="block text-sm font-medium text-gray-700">Telefone Principal *</label>
						<input
							type="text"
							id="phone"
							bind:value={formData.phone}
							on:input={formatPhone}
							on:blur={() => validateField('phone', formData.phone)}
							class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 {errors.phone ? 'border-red-300' : ''}"
							placeholder="(11) 99999-9999"
						/>
						{#if errors.phone}
							<p class="mt-1 text-sm text-red-600">{errors.phone}</p>
						{/if}
					</div>

					<!-- Phone 2 -->
					<div>
						<label for="phone2" class="block text-sm font-medium text-gray-700">Telefone Secundário</label>
						<input
							type="text"
							id="phone2"
							bind:value={formData.phone2}
							on:input={formatPhone}
							class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
							placeholder="(11) 99999-9999"
						/>
					</div>
				</div>
			</div>

			<!-- Address Information -->
			<div class="bg-gray-50 p-4 rounded-lg">
				<h4 class="text-md font-medium text-gray-900 mb-4">Endereço</h4>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<!-- Address -->
					<div class="md:col-span-2">
						<label for="address" class="block text-sm font-medium text-gray-700">Endereço *</label>
						<input
							type="text"
							id="address"
							bind:value={formData.address}
							on:blur={() => validateField('address', formData.address)}
							class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 {errors.address ? 'border-red-300' : ''}"
							placeholder="Rua, Avenida, etc."
						/>
						{#if errors.address}
							<p class="mt-1 text-sm text-red-600">{errors.address}</p>
						{/if}
					</div>

					<!-- Number -->
					<div>
						<label for="number" class="block text-sm font-medium text-gray-700">Número *</label>
						<input
							type="text"
							id="number"
							bind:value={formData.number}
							on:blur={() => validateField('number', formData.number)}
							class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 {errors.number ? 'border-red-300' : ''}"
							placeholder="123"
						/>
						{#if errors.number}
							<p class="mt-1 text-sm text-red-600">{errors.number}</p>
						{/if}
					</div>

					<!-- Complement -->
					<div>
						<label for="complement" class="block text-sm font-medium text-gray-700">Complemento</label>
						<input
							type="text"
							id="complement"
							bind:value={formData.complement}
							class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
							placeholder="Apto, Sala, etc."
						/>
					</div>

					<!-- Neighborhood -->
					<div>
						<label for="neighborhood" class="block text-sm font-medium text-gray-700">Bairro *</label>
						<input
							type="text"
							id="neighborhood"
							bind:value={formData.neighborhood}
							on:blur={() => validateField('neighborhood', formData.neighborhood)}
							class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 {errors.neighborhood ? 'border-red-300' : ''}"
							placeholder="Nome do bairro"
						/>
						{#if errors.neighborhood}
							<p class="mt-1 text-sm text-red-600">{errors.neighborhood}</p>
						{/if}
					</div>

					<!-- City -->
					<div>
						<label for="city" class="block text-sm font-medium text-gray-700">Cidade *</label>
						<input
							type="text"
							id="city"
							bind:value={formData.city}
							on:blur={() => validateField('city', formData.city)}
							class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 {errors.city ? 'border-red-300' : ''}"
							placeholder="Nome da cidade"
						/>
						{#if errors.city}
							<p class="mt-1 text-sm text-red-600">{errors.city}</p>
						{/if}
					</div>

					<!-- State -->
					<div>
						<label for="state" class="block text-sm font-medium text-gray-700">Estado *</label>
						<select
							id="state"
							bind:value={formData.state}
							on:blur={() => validateField('state', formData.state)}
							class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 {errors.state ? 'border-red-300' : ''}"
						>
							<option value="">Selecione</option>
							{#each brazilianStates as state}
								<option value={state}>{state}</option>
							{/each}
						</select>
						{#if errors.state}
							<p class="mt-1 text-sm text-red-600">{errors.state}</p>
						{/if}
					</div>

					<!-- ZIP Code -->
					<div>
						<label for="zipCode" class="block text-sm font-medium text-gray-700">CEP *</label>
						<input
							type="text"
							id="zipCode"
							bind:value={formData.zipCode}
							on:input={formatZipCode}
							on:blur={() => validateField('zipCode', formData.zipCode)}
							class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 {errors.zipCode ? 'border-red-300' : ''}"
							placeholder="00000-000"
						/>
						{#if errors.zipCode}
							<p class="mt-1 text-sm text-red-600">{errors.zipCode}</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Form Actions -->
			<div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
				<button
					type="button"
					on:click={handleCancel}
					class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					disabled={loading}
				>
					Cancelar
				</button>
				<button
					type="submit"
					class="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={loading}
				>
					{loading ? 'Salvando...' : (isEdit ? 'Atualizar' : 'Criar')}
				</button>
			</div>
		</form>
	</div>
</div>