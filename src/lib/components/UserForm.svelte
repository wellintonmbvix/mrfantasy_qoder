<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	export let user: any = null;
	
	const dispatch = createEventDispatcher();
	
	let formData = {
		username: user?.username || '',
		email: user?.email || '',
		password: '',
		confirmPassword: '',
		role: user?.role || 'EMPLOYEE',
		active: user?.active !== undefined ? user.active : true
	};
	
	let errors: Record<string, string> = {};
	let loading = false;
	let showPassword = false;
	let showConfirmPassword = false;
	
	// Reactive declarations
	let isEdit: boolean;
	let modalTitle: string;
	
	$: {
		isEdit = !!user;
		modalTitle = isEdit ? 'Editar Usuário' : 'Novo Usuário';
	}
	
	const roleOptions = [
		{ value: 'EMPLOYEE', label: 'Funcionário' },
		{ value: 'MANAGER', label: 'Gerente' },
		{ value: 'ADMIN', label: 'Administrador' }
	];
	
	function validateForm() {
		errors = {};
		
		if (!formData.username.trim()) {
			errors.username = 'Nome de usuário é obrigatório';
		} else if (formData.username.length < 3) {
			errors.username = 'Nome de usuário deve ter pelo menos 3 caracteres';
		}
		
		if (!formData.email.trim()) {
			errors.email = 'Email é obrigatório';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			errors.email = 'Email inválido';
		}
		
		// Password validation (only required for new users)
		if (!isEdit) {
			if (!formData.password) {
				errors.password = 'Senha é obrigatória';
			} else if (formData.password.length < 6) {
				errors.password = 'Senha deve ter pelo menos 6 caracteres';
			}
			
			if (!formData.confirmPassword) {
				errors.confirmPassword = 'Confirmação de senha é obrigatória';
			} else if (formData.password !== formData.confirmPassword) {
				errors.confirmPassword = 'Senhas não coincidem';
			}
		} else if (formData.password) {
			// For edit mode, validate password only if provided
			if (formData.password.length < 6) {
				errors.password = 'Senha deve ter pelo menos 6 caracteres';
			}
			
			if (formData.password !== formData.confirmPassword) {
				errors.confirmPassword = 'Senhas não coincidem';
			}
		}
		
		return Object.keys(errors).length === 0;
	}
	
	function handleSubmit() {
		if (!validateForm()) return;
		
		loading = true;
		
		const submitData: any = {
			username: formData.username.trim(),
			email: formData.email.trim(),
			role: formData.role,
			active: formData.active
		};
		
		// Only include password if provided
		if (formData.password) {
			submitData.password = formData.password;
		}
		
		if (isEdit) {
			submitData.id = user.id;
		}
		
		dispatch('submit', {
			user: submitData,
			isEdit
		});
		loading = false;
	}
	
	function handleCancel() {
		dispatch('cancel');
	}
	
	function togglePasswordVisibility(field: 'password' | 'confirmPassword') {
		if (field === 'password') {
			showPassword = !showPassword;
		} else {
			showConfirmPassword = !showConfirmPassword;
		}
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
				<!-- Username -->
				<div>
					<label for="username" class="form-label">Nome de usuário *</label>
					<input
						id="username"
						type="text"
						bind:value={formData.username}
						class="form-input {errors.username ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
						placeholder="Digite o nome de usuário"
						required
					/>
					{#if errors.username}
						<p class="mt-1 text-sm text-red-600">{errors.username}</p>
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
				
				<!-- Role -->
				<div>
					<label for="role" class="form-label">Papel *</label>
					<select
						id="role"
						bind:value={formData.role}
						class="form-input"
						required
					>
						{#each roleOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>
				
				<!-- Password -->
				<div>
					<label for="password" class="form-label">
						Senha {isEdit ? '(deixe em branco para não alterar)' : '*'}
					</label>
					<div class="relative">
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							bind:value={formData.password}
							class="form-input pr-10 {errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
							placeholder={isEdit ? 'Nova senha (opcional)' : 'Digite a senha'}
							required={!isEdit}
						/>
						<button
							type="button"
							on:click={() => togglePasswordVisibility('password')}
							class="absolute inset-y-0 right-0 pr-3 flex items-center"
						>
							{#if showPassword}
								<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
								</svg>
							{:else}
								<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
								</svg>
							{/if}
						</button>
					</div>
					{#if errors.password}
						<p class="mt-1 text-sm text-red-600">{errors.password}</p>
					{/if}
				</div>
				
				<!-- Confirm Password -->
				{#if formData.password || !isEdit}
					<div>
						<label for="confirmPassword" class="form-label">Confirmar senha *</label>
						<div class="relative">
							<input
								id="confirmPassword"
								type={showConfirmPassword ? 'text' : 'password'}
								bind:value={formData.confirmPassword}
								class="form-input pr-10 {errors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
								placeholder="Confirme a senha"
								required={!!formData.password || !isEdit}
							/>
							<button
								type="button"
								on:click={() => togglePasswordVisibility('confirmPassword')}
								class="absolute inset-y-0 right-0 pr-3 flex items-center"
							>
								{#if showConfirmPassword}
									<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
									</svg>
								{:else}
									<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
								{/if}
							</button>
						</div>
						{#if errors.confirmPassword}
							<p class="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
						{/if}
					</div>
				{/if}
				
				<!-- Active Status -->
				{#if isEdit}
					<div>
						<label class="flex items-center">
							<input
								type="checkbox"
								bind:checked={formData.active}
								class="form-checkbox h-4 w-4 text-primary-600"
							/>
							<span class="ml-2 text-sm text-gray-700">Usuário ativo</span>
						</label>
					</div>
				{/if}
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
						{isEdit ? 'Atualizar' : 'Criar'} Usuário
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>