<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	export let customer: any = null;
	
	const dispatch = createEventDispatcher();
	
	let formData = {
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
	
	let errors: Record<string, string> = {};
	let loading = false;
	
	// Reactive declarations
	let isEdit: boolean;
	let modalTitle: string;
	
	$: {
		isEdit = !!customer;
		modalTitle = isEdit ? 'Editar Cliente' : 'Novo Cliente';
	}
	
	function validateForm() {
		errors = {};
		
		if (!formData.name.trim()) {
			errors.name = 'Nome é obrigatório';
		}
		
		if (!formData.email.trim()) {
			errors.email = 'Email é obrigatório';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			errors.email = 'Email inválido';
		}
		
		if (!formData.phone.trim()) {
			errors.phone = 'Telefone é obrigatório';
		}
		
		if (!formData.address.trim()) {
			errors.address = 'Endereço é obrigatório';
		}
		
		if (!formData.number.trim()) {
			errors.number = 'Número é obrigatório';
		}
		
		if (!formData.neighborhood.trim()) {
			errors.neighborhood = 'Bairro é obrigatório';
		}
		
		if (!formData.city.trim()) {
			errors.city = 'Cidade é obrigatória';
		}
		
		if (!formData.state.trim()) {
			errors.state = 'Estado é obrigatório';
		} else if (formData.state.length !== 2) {
			errors.state = 'Estado deve ter 2 caracteres (UF)';
		}
		
		if (!formData.zipCode.trim()) {
			errors.zipCode = 'CEP é obrigatório';
		}
		
		if (!formData.documentNumber.trim()) {
			errors.documentNumber = 'Documento é obrigatório';
		}
		
		return Object.keys(errors).length === 0;
	}
	
	function handleSubmit() {
		if (!validateForm()) return;
		
		loading = true;
		dispatch('submit', {
			customer: formData,
			isEdit
		});
		loading = false;
	}
	
	function handleCancel() {
		dispatch('cancel');
	}
	
	function formatPhone(value: string) {
		// Remove all non-digits
		const cleaned = value.replace(/\D/g, '');
		
		// Apply phone mask (11) 99999-9999
		if (cleaned.length <= 11) {
			return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
		}
		
		return value;
	}
	
	function formatDocument(value: string) {
		// Remove all non-digits
		const cleaned = value.replace(/\D/g, '');
		
		// Apply CPF mask 999.999.999-99
		if (cleaned.length <= 11) {
			return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
		}
		
		return value;
	}
	
	function formatCEP(value: string) {
		// Remove all non-digits
		const cleaned = value.replace(/\D/g, '');
		
		// Apply CEP mask 99999-999
		if (cleaned.length <= 8) {
			return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
		}
		
		return value;
	}
	
	function formatState(value: string) {
		// Convert to uppercase and limit to 2 characters
		return value.toUpperCase().slice(0, 2);
	}
	
	function handlePhoneInput(event: Event) {
		const target = event.target as HTMLInputElement;
		formData.phone = formatPhone(target.value);
	}
	
	function handlePhone2Input(event: Event) {
		const target = event.target as HTMLInputElement;
		formData.phone2 = formatPhone(target.value);
	}
	
	function handleDocumentInput(event: Event) {
		const target = event.target as HTMLInputElement;
		formData.documentNumber = formatDocument(target.value);
	}
	
	function handleCEPInput(event: Event) {
		const target = event.target as HTMLInputElement;
		formData.zipCode = formatCEP(target.value);
	}
	
	function handleStateInput(event: Event) {
		const target = event.target as HTMLInputElement;
		formData.state = formatState(target.value);
	}
</script>

<!-- Modal Backdrop -->
<div 
	class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" 
	on:click={handleCancel}
	on:keydown={(e) => {
		if (e.key === 'Escape') {
			handleCancel();
		}
	}}
	tabindex="0"
	role="dialog"
	aria-modal="true"
	aria-labelledby="modal-title"
>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<div 
		class="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 xl:w-2/5 shadow-lg rounded-md bg-white" 
		on:click|stopPropagation
		on:keydown|stopPropagation
		tabindex="-1"
		role="document"
	>
		<!-- Modal Header -->
		<div class="flex items-center justify-between pb-4 border-b">
			<h3 id="modal-title" class="text-lg font-medium text-gray-900">{modalTitle}</h3>
			<!-- svelte-ignore a11y_consider_explicit_label -->
			<button
				on:click={handleCancel}
				class="text-gray-400 hover:text-gray-600 transition-colors"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
		
		<!-- Modal Body -->
		<form on:submit|preventDefault={handleSubmit} class="mt-4">
			<div class="grid grid-cols-1 gap-4">
				<!-- Name -->
				<div>
					<label for="name" class="form-label">Nome completo *</label>
					<input
						id="name"
						type="text"
						bind:value={formData.name}
						class="form-input {errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
						placeholder="Digite o nome completo"
						required
					/>
					{#if errors.name}
						<p class="mt-1 text-sm text-red-600">{errors.name}</p>
					{/if}
				</div>
				
				<!-- Email -->
				<div>
					<label for="email" class="form-label">Email *</label>
					<input
						id="email"
						type="email"
						bind:value={formData.email}
						class="form-input {errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
						placeholder="exemplo@email.com"
						required
					/>
					{#if errors.email}
						<p class="mt-1 text-sm text-red-600">{errors.email}</p>
					{/if}
				</div>
				
				<!-- Document Number -->
				<div>
					<label for="documentNumber" class="form-label">CPF *</label>
					<input
						id="documentNumber"
						type="text"
						value={formData.documentNumber}
						on:input={handleDocumentInput}
						class="form-input {errors.documentNumber ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
						placeholder="999.999.999-99"
						required
					/>
					{#if errors.documentNumber}
						<p class="mt-1 text-sm text-red-600">{errors.documentNumber}</p>
					{/if}
				</div>
				
				<!-- Phones -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="phone" class="form-label">Telefone *</label>
						<input
							id="phone"
							type="tel"
							value={formData.phone}
							on:input={handlePhoneInput}
							class="form-input {errors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
							placeholder="(11) 99999-9999"
							required
						/>
						{#if errors.phone}
							<p class="mt-1 text-sm text-red-600">{errors.phone}</p>
						{/if}
					</div>
					
					<div>
						<label for="phone2" class="form-label">Telefone 2</label>
						<input
							id="phone2"
							type="tel"
							value={formData.phone2}
							on:input={handlePhone2Input}
							class="form-input"
							placeholder="(11) 88888-8888"
						/>
					</div>
				</div>
				
				<!-- Address Fields -->
				<div class="space-y-4">
					<h4 class="text-md font-medium text-gray-700 border-b pb-2">Endereço</h4>
					
					<!-- Street Address -->
					<div>
						<label for="address" class="form-label">Logradouro *</label>
						<input
							id="address"
							type="text"
							bind:value={formData.address}
							class="form-input {errors.address ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
							placeholder="Rua das Flores"
							required
						/>
						{#if errors.address}
							<p class="mt-1 text-sm text-red-600">{errors.address}</p>
						{/if}
					</div>
					
					<!-- Number and Complement -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label for="number" class="form-label">Número *</label>
							<input
								id="number"
								type="text"
								bind:value={formData.number}
								class="form-input {errors.number ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
								placeholder="123"
								required
							/>
							{#if errors.number}
								<p class="mt-1 text-sm text-red-600">{errors.number}</p>
							{/if}
						</div>
						
						<div>
							<label for="complement" class="form-label">Complemento</label>
							<input
								id="complement"
								type="text"
								bind:value={formData.complement}
								class="form-input"
								placeholder="Apto 45"
							/>
						</div>
					</div>
					
					<!-- Neighborhood -->
					<div>
						<label for="neighborhood" class="form-label">Bairro *</label>
						<input
							id="neighborhood"
							type="text"
							bind:value={formData.neighborhood}
							class="form-input {errors.neighborhood ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
							placeholder="Centro"
							required
						/>
						{#if errors.neighborhood}
							<p class="mt-1 text-sm text-red-600">{errors.neighborhood}</p>
						{/if}
					</div>
					
					<!-- City, State and ZIP -->
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div class="md:col-span-2">
							<label for="city" class="form-label">Cidade *</label>
							<input
								id="city"
								type="text"
								bind:value={formData.city}
								class="form-input {errors.city ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
								placeholder="São Paulo"
								required
							/>
							{#if errors.city}
								<p class="mt-1 text-sm text-red-600">{errors.city}</p>
							{/if}
						</div>
						
						<div>
							<label for="state" class="form-label">UF *</label>
							<input
								id="state"
								type="text"
								value={formData.state}
								on:input={handleStateInput}
								class="form-input {errors.state ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
								placeholder="SP"
								maxlength="2"
								required
							/>
							{#if errors.state}
								<p class="mt-1 text-sm text-red-600">{errors.state}</p>
							{/if}
						</div>
					</div>
					
					<!-- ZIP Code -->
					<div>
						<label for="zipCode" class="form-label">CEP *</label>
						<input
							id="zipCode"
							type="text"
							value={formData.zipCode}
							on:input={handleCEPInput}
							class="form-input {errors.zipCode ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
							placeholder="01234-567"
							required
						/>
						{#if errors.zipCode}
							<p class="mt-1 text-sm text-red-600">{errors.zipCode}</p>
						{/if}
					</div>
				</div>
			</div>
			
			<!-- Modal Footer -->
			<div class="flex items-center justify-end space-x-3 pt-6 border-t mt-6">
				<button
					type="button"
					on:click={handleCancel}
					class="btn btn-secondary"
					disabled={loading}
				>
					Cancelar
				</button>
				<button
					type="submit"
					class="btn btn-primary"
					disabled={loading}
				>
					{#if loading}
						<svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Salvando...
					{:else}
						{isEdit ? 'Atualizar' : 'Criar'} Cliente
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>