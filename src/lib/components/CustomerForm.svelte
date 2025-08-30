<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	export let customer: any = null;
	
	const dispatch = createEventDispatcher();
	
	let formData = {
		name: customer?.name || '',
		email: customer?.email || '',
		phone: customer?.phone || '',
		address: customer?.address || '',
		documentNumber: customer?.documentNumber || ''
	};
	
	let errors: Record<string, string> = {};
	let loading = false;
	
	$: isEdit = !!customer;
	$: modalTitle = isEdit ? 'Editar Cliente' : 'Novo Cliente';
	
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
	
	function handlePhoneInput(event: Event) {
		const target = event.target as HTMLInputElement;
		formData.phone = formatPhone(target.value);
	}
	
	function handleDocumentInput(event: Event) {
		const target = event.target as HTMLInputElement;
		formData.documentNumber = formatDocument(target.value);
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
				
				<!-- Phone -->
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
				
				<!-- Address -->
				<div>
					<label for="address" class="form-label">Endereço completo *</label>
					<textarea
						id="address"
						bind:value={formData.address}
						rows="3"
						class="form-input {errors.address ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
						placeholder="Rua, número, bairro, cidade - UF, CEP"
						required
					></textarea>
					{#if errors.address}
						<p class="mt-1 text-sm text-red-600">{errors.address}</p>
					{/if}
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