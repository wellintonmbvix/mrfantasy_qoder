<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { z } from 'zod';
	import { validateForm } from '$lib/utils/validation.js';
	
	export let schema: z.ZodSchema<any>;
	export let initialData: any = {};
	export let title: string;
	export let submitText: string = 'Salvar';
	export let loading: boolean = false;
	export let showCancel: boolean = true;
	
	const dispatch = createEventDispatcher();
	
	let formData = { ...initialData };
	let errors: Record<string, string> = {};
	let touched: Record<string, boolean> = {};
	let generalError: string = '';
	
	$: isValid = Object.keys(errors).length === 0 && Object.keys(touched).length > 0;
	
	function validateField(fieldName: string, value: any) {
		const fieldSchema = schema.shape[fieldName];
		if (!fieldSchema) return;
		
		try {
			fieldSchema.parse(value);
			delete errors[fieldName];
			errors = { ...errors };
		} catch (error) {
			if (error instanceof z.ZodError) {
				errors[fieldName] = error.errors[0]?.message || 'Campo inválido';
				errors = { ...errors };
			}
		}
	}
	
	function handleInput(fieldName: string, value: any) {
		formData[fieldName] = value;
		touched[fieldName] = true;
		touched = { ...touched };
		
		// Clear previous error for this field
		if (errors[fieldName]) {
			delete errors[fieldName];
			errors = { ...errors };
		}
		
		// Validate field on blur for better UX
		setTimeout(() => validateField(fieldName, value), 300);
	}
	
	function handleSubmit() {
		// Mark all fields as touched
		Object.keys(schema.shape).forEach(key => {
			touched[key] = true;
		});
		touched = { ...touched };
		
		// Validate entire form
		const validation = validateForm(schema, formData);
		
		if (validation.success) {
			errors = {};
			generalError = '';
			dispatch('submit', validation.data);
		} else {
			errors = validation.errors || {};
			generalError = 'Por favor, corrija os erros abaixo';
		}
	}
	
	function handleCancel() {
		dispatch('cancel');
	}
	
	function getFieldError(fieldName: string): string {
		return touched[fieldName] ? errors[fieldName] || '' : '';
	}
	
	function hasFieldError(fieldName: string): boolean {
		return touched[fieldName] && !!errors[fieldName];
	}
</script>

<!-- Modal Backdrop -->
<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" on:click={handleCancel}>
	<div class="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 xl:w-2/5 shadow-lg rounded-md bg-white" on:click|stopPropagation>
		<!-- Modal Header -->
		<div class="flex items-center justify-between pb-4 border-b">
			<h3 class="text-lg font-medium text-gray-900">{title}</h3>
			<button
				on:click={handleCancel}
				class="text-gray-400 hover:text-gray-600 transition-colors"
				disabled={loading}
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
		
		<!-- Modal Body -->
		<form on:submit|preventDefault={handleSubmit} class="mt-4">
			{#if generalError}
				<div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
					{generalError}
				</div>
			{/if}
			
			<div class="space-y-4">
				<slot 
					{formData}
					{handleInput}
					{getFieldError}
					{hasFieldError}
					{touched}
					{errors}
				/>
			</div>
			
			<!-- Modal Footer -->
			<div class="flex items-center justify-end space-x-3 pt-6 border-t mt-6">
				{#if showCancel}
					<button
						type="button"
						on:click={handleCancel}
						class="btn btn-secondary"
						disabled={loading}
					>
						Cancelar
					</button>
				{/if}
				<button
					type="submit"
					class="btn btn-primary"
					disabled={loading || !isValid}
				>
					{#if loading}
						<svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Salvando...
					{:else}
						{submitText}
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>