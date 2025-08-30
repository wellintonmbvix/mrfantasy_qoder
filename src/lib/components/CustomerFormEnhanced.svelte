<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import FormModal from '$lib/components/FormModal.svelte';
	import FormInput from '$lib/components/FormInput.svelte';
	import FormTextarea from '$lib/components/FormTextarea.svelte';
	import { customerSchema, formatPhone, formatCPF } from '$lib/utils/validation.js';
	
	export let customer: any = null;
	
	const dispatch = createEventDispatcher();
	
	$: isEdit = !!customer;
	$: modalTitle = isEdit ? 'Editar Cliente' : 'Novo Cliente';
	$: submitText = isEdit ? 'Atualizar Cliente' : 'Criar Cliente';
	
	let loading = false;
	
	const initialData = {
		name: customer?.name || '',
		email: customer?.email || '',
		phone: customer?.phone || '',
		address: customer?.address || '',
		documentNumber: customer?.documentNumber || ''
	};
	
	async function handleSubmit(event: CustomEvent) {
		loading = true;
		try {
			const formData = event.detail;
			dispatch('submit', {
				customer: formData,
				isEdit
			});
		} finally {
			loading = false;
		}
	}
	
	function handleCancel() {
		dispatch('cancel');
	}
</script>

<FormModal
	schema={customerSchema}
	{initialData}
	title={modalTitle}
	{submitText}
	{loading}
	on:submit={handleSubmit}
	on:cancel={handleCancel}
	let:formData
	let:handleInput
	let:getFieldError
	let:hasFieldError
>
	<!-- Name Field -->
	<FormInput
		id="name"
		label="Nome completo"
		value={formData.name}
		placeholder="Digite o nome completo"
		required
		error={getFieldError('name')}
		on:input={(e) => handleInput('name', e.detail.target.value)}
	/>
	
	<!-- Email Field -->
	<FormInput
		id="email"
		label="Email"
		type="email"
		value={formData.email}
		placeholder="exemplo@email.com"
		required
		error={getFieldError('email')}
		autocomplete="email"
		on:input={(e) => handleInput('email', e.detail.target.value)}
	/>
	
	<!-- Phone Field -->
	<FormInput
		id="phone"
		label="Telefone"
		type="tel"
		value={formData.phone}
		placeholder="(11) 99999-9999"
		required
		error={getFieldError('phone')}
		formatter={formatPhone}
		autocomplete="tel"
		on:input={(e) => handleInput('phone', e.detail.target.value)}
	/>
	
	<!-- Document Number Field -->
	<FormInput
		id="documentNumber"
		label="CPF"
		value={formData.documentNumber}
		placeholder="999.999.999-99"
		required
		error={getFieldError('documentNumber')}
		formatter={formatCPF}
		maxlength="14"
		on:input={(e) => handleInput('documentNumber', e.detail.target.value)}
	/>
	
	<!-- Address Field -->
	<FormTextarea
		id="address"
		label="Endereço completo"
		value={formData.address}
		placeholder="Rua, número, bairro, cidade - UF, CEP"
		required
		error={getFieldError('address')}
		rows={3}
		maxlength={500}
		on:input={(e) => handleInput('address', e.detail.target.value)}
	/>
</FormModal>