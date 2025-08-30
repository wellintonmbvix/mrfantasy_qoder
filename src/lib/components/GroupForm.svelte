<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	export let group: any = null;
	
	const dispatch = createEventDispatcher();
	
	let formData = {
		name: group?.name || '',
		description: group?.description || '',
		category: group?.category || ''
	};
	
	let errors: Record<string, string> = {};
	let loading = false;
	
	$: isEdit = !!group;
	$: modalTitle = isEdit ? 'Editar Grupo' : 'Novo Grupo';
	
	const categories = [
		'FANTASY',
		'ACCESSORY',
		'SUPERHERO',
		'DISNEY',
		'PRINCESS',
		'HALLOWEEN',
		'CARNIVAL',
		'PARTY',
		'COSPLAY',
		'HISTORICAL',
		'PROFESSION',
		'ANIMAL',
		'OTHER'
	];
	
	const categoryLabels: Record<string, string> = {
		'FANTASY': 'Fantasias',
		'ACCESSORY': 'Acessórios',
		'SUPERHERO': 'Super-heróis',
		'DISNEY': 'Disney',
		'PRINCESS': 'Princesas',
		'HALLOWEEN': 'Halloween',
		'CARNIVAL': 'Carnaval',
		'PARTY': 'Festa',
		'COSPLAY': 'Cosplay',
		'HISTORICAL': 'Histórico',
		'PROFESSION': 'Profissões',
		'ANIMAL': 'Animais',
		'OTHER': 'Outros'
	};
	
	function validateForm() {
		errors = {};
		
		if (!formData.name.trim()) {
			errors.name = 'Nome é obrigatório';
		}
		
		if (!formData.category) {
			errors.category = 'Categoria é obrigatória';
		}
		
		return Object.keys(errors).length === 0;
	}
	
	function handleSubmit() {
		if (!validateForm()) return;
		
		loading = true;
		dispatch('submit', {
			group: formData,
			isEdit
		});
		loading = false;
	}
	
	function handleCancel() {
		dispatch('cancel');
	}
</script>

<!-- Modal Backdrop -->
<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" on:click={handleCancel}>
	<div class="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 xl:w-2/5 shadow-lg rounded-md bg-white" on:click|stopPropagation>
		<!-- Modal Header -->
		<div class="flex items-center justify-between pb-4 border-b">
			<h3 class="text-lg font-medium text-gray-900">{modalTitle}</h3>
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
			<div class="space-y-4">
				<!-- Name -->
				<div>
					<label for="name" class="form-label">Nome do grupo *</label>
					<input
						id="name"
						type="text"
						bind:value={formData.name}
						class="form-input {errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
						placeholder="Ex: Super-heróis, Princesas, Acessórios"
						required
					/>
					{#if errors.name}
						<p class="mt-1 text-sm text-red-600">{errors.name}</p>
					{/if}
				</div>
				
				<!-- Category -->
				<div>
					<label for="category" class="form-label">Categoria *</label>
					<select
						id="category"
						bind:value={formData.category}
						class="form-input {errors.category ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
						required
					>
						<option value="">Selecione uma categoria</option>
						{#each categories as category}
							<option value={category}>{categoryLabels[category]}</option>
						{/each}
					</select>
					{#if errors.category}
						<p class="mt-1 text-sm text-red-600">{errors.category}</p>
					{/if}
				</div>
				
				<!-- Description -->
				<div>
					<label for="description" class="form-label">Descrição</label>
					<textarea
						id="description"
						bind:value={formData.description}
						rows="3"
						class="form-input"
						placeholder="Descrição do grupo de produtos (opcional)"
					></textarea>
					<p class="mt-1 text-sm text-gray-500">
						Descreva o tipo de produtos que pertencem a este grupo
					</p>
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
						{isEdit ? 'Atualizar' : 'Criar'} Grupo
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>