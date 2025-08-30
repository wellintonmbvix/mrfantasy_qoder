<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	export let product: any = null;
	export let groups: any[] = [];
	
	const dispatch = createEventDispatcher();
	
	let formData = {
		name: product?.name || '',
		description: product?.description || '',
		sku: product?.sku || '',
		rentalPrice: product?.rentalPrice || 0,
		salePrice: product?.salePrice || 0,
		stockQuantity: product?.stockQuantity || 0,
		size: product?.size || '',
		color: product?.color || '',
		productType: product?.productType || 'FANTASY',
		groupId: product?.groupId || '',
		imageUrl: product?.imageUrl || '',
		availableForRental: product?.availableForRental ?? true,
		availableForSale: product?.availableForSale ?? true
	};
	
	let errors: Record<string, string> = {};
	let loading = false;
	
	$: isEdit = !!product;
	$: modalTitle = isEdit ? 'Editar Produto' : 'Novo Produto';
	
	function validateForm() {
		errors = {};
		
		if (!formData.name.trim()) {
			errors.name = 'Nome é obrigatório';
		}
		
		if (!formData.sku.trim()) {
			errors.sku = 'SKU é obrigatório';
		}
		
		if (formData.rentalPrice < 0) {
			errors.rentalPrice = 'Preço de aluguel deve ser maior ou igual a 0';
		}
		
		if (formData.salePrice < 0) {
			errors.salePrice = 'Preço de venda deve ser maior ou igual a 0';
		}
		
		if (formData.stockQuantity < 0) {
			errors.stockQuantity = 'Quantidade deve ser maior ou igual a 0';
		}
		
		if (!formData.groupId) {
			errors.groupId = 'Grupo é obrigatório';
		}
		
		return Object.keys(errors).length === 0;
	}
	
	function handleSubmit() {
		if (!validateForm()) return;
		
		loading = true;
		
		// Convert string values to appropriate types
		const submitData = {
			...formData,
			rentalPrice: Number(formData.rentalPrice),
			salePrice: Number(formData.salePrice),
			stockQuantity: Number(formData.stockQuantity),
			groupId: Number(formData.groupId)
		};
		
		dispatch('submit', {
			product: submitData,
			isEdit
		});
		loading = false;
	}
	
	function handleCancel() {
		dispatch('cancel');
	}
	
	function generateSKU() {
		const prefix = formData.productType === 'FANTASY' ? 'FAN' : 'ACC';
		const timestamp = Date.now().toString().slice(-6);
		formData.sku = `${prefix}-${timestamp}`;
	}
</script>

<!-- Modal Backdrop -->
<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" on:click={handleCancel}>
	<div class="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 xl:w-2/5 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto" on:click|stopPropagation>
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
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<!-- Name -->
				<div class="md:col-span-2">
					<label for="name" class="form-label">Nome do produto *</label>
					<input
						id="name"
						type="text"
						bind:value={formData.name}
						class="form-input {errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
						placeholder="Digite o nome do produto"
						required
					/>
					{#if errors.name}
						<p class="mt-1 text-sm text-red-600">{errors.name}</p>
					{/if}
				</div>
				
				<!-- SKU -->
				<div>
					<label for="sku" class="form-label">SKU *</label>
					<div class="flex">
						<input
							id="sku"
							type="text"
							bind:value={formData.sku}
							class="form-input rounded-r-none {errors.sku ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
							placeholder="Código único"
							required
						/>
						<button
							type="button"
							on:click={generateSKU}
							class="px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-700 text-sm rounded-r-md hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
							title="Gerar SKU automaticamente"
						>
							Auto
						</button>
					</div>
					{#if errors.sku}
						<p class="mt-1 text-sm text-red-600">{errors.sku}</p>
					{/if}
				</div>
				
				<!-- Product Type -->
				<div>
					<label for="productType" class="form-label">Tipo *</label>
					<select
						id="productType"
						bind:value={formData.productType}
						class="form-input"
						required
					>
						<option value="FANTASY">Fantasia</option>
						<option value="ACCESSORY">Acessório</option>
					</select>
				</div>
				
				<!-- Group -->
				<div>
					<label for="groupId" class="form-label">Grupo *</label>
					<select
						id="groupId"
						bind:value={formData.groupId}
						class="form-input {errors.groupId ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
						required
					>
						<option value="">Selecione um grupo</option>
						{#each groups as group}
							<option value={group.id}>{group.name}</option>
						{/each}
					</select>
					{#if errors.groupId}
						<p class="mt-1 text-sm text-red-600">{errors.groupId}</p>
					{/if}
				</div>
				
				<!-- Stock Quantity -->
				<div>
					<label for="stockQuantity" class="form-label">Quantidade em estoque *</label>
					<input
						id="stockQuantity"
						type="number"
						min="0"
						bind:value={formData.stockQuantity}
						class="form-input {errors.stockQuantity ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
						placeholder="0"
						required
					/>
					{#if errors.stockQuantity}
						<p class="mt-1 text-sm text-red-600">{errors.stockQuantity}</p>
					{/if}
				</div>
				
				<!-- Rental Price -->
				<div>
					<label for="rentalPrice" class="form-label">Preço de aluguel (R$) *</label>
					<input
						id="rentalPrice"
						type="number"
						min="0"
						step="0.01"
						bind:value={formData.rentalPrice}
						class="form-input {errors.rentalPrice ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
						placeholder="0,00"
						required
					/>
					{#if errors.rentalPrice}
						<p class="mt-1 text-sm text-red-600">{errors.rentalPrice}</p>
					{/if}
				</div>
				
				<!-- Sale Price -->
				<div>
					<label for="salePrice" class="form-label">Preço de venda (R$) *</label>
					<input
						id="salePrice"
						type="number"
						min="0"
						step="0.01"
						bind:value={formData.salePrice}
						class="form-input {errors.salePrice ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
						placeholder="0,00"
						required
					/>
					{#if errors.salePrice}
						<p class="mt-1 text-sm text-red-600">{errors.salePrice}</p>
					{/if}
				</div>
				
				<!-- Size -->
				<div>
					<label for="size" class="form-label">Tamanho</label>
					<select
						id="size"
						bind:value={formData.size}
						class="form-input"
					>
						<option value="">Selecione o tamanho</option>
						<option value="PP">PP</option>
						<option value="P">P</option>
						<option value="M">M</option>
						<option value="G">G</option>
						<option value="GG">GG</option>
						<option value="XGG">XGG</option>
						<option value="Único">Único</option>
					</select>
				</div>
				
				<!-- Color -->
				<div>
					<label for="color" class="form-label">Cor</label>
					<input
						id="color"
						type="text"
						bind:value={formData.color}
						class="form-input"
						placeholder="Ex: Azul, Vermelho"
					/>
				</div>
				
				<!-- Image URL -->
				<div class="md:col-span-2">
					<label for="imageUrl" class="form-label">URL da imagem</label>
					<input
						id="imageUrl"
						type="url"
						bind:value={formData.imageUrl}
						class="form-input"
						placeholder="https://exemplo.com/imagem.jpg"
					/>
				</div>
				
				<!-- Description -->
				<div class="md:col-span-2">
					<label for="description" class="form-label">Descrição</label>
					<textarea
						id="description"
						bind:value={formData.description}
						rows="3"
						class="form-input"
						placeholder="Descrição detalhada do produto"
					></textarea>
				</div>
				
				<!-- Availability Options -->
				<div class="md:col-span-2 space-y-2">
					<div class="flex items-center">
						<input
							id="availableForRental"
							type="checkbox"
							bind:checked={formData.availableForRental}
							class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
						/>
						<label for="availableForRental" class="ml-2 block text-sm text-gray-900">
							Disponível para aluguel
						</label>
					</div>
					<div class="flex items-center">
						<input
							id="availableForSale"
							type="checkbox"
							bind:checked={formData.availableForSale}
							class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
						/>
						<label for="availableForSale" class="ml-2 block text-sm text-gray-900">
							Disponível para venda
						</label>
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
						{isEdit ? 'Atualizar' : 'Criar'} Produto
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>