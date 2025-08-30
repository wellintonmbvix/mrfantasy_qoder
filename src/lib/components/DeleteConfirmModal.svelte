<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	export let title = 'Confirmar exclusão';
	export let message = 'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.';
	export let confirmText = 'Excluir';
	export let cancelText = 'Cancelar';
	
	const dispatch = createEventDispatcher();
	
	let loading = false;
	
	function handleConfirm() {
		loading = true;
		dispatch('confirm');
		loading = false;
	}
	
	function handleCancel() {
		dispatch('cancel');
	}
</script>

<!-- Modal Backdrop -->
<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" on:click={handleCancel}>
	<div class="relative top-20 mx-auto p-5 border w-11/12 md:w-96 shadow-lg rounded-md bg-white" on:click|stopPropagation>
		<!-- Modal Header -->
		<div class="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
			<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
			</svg>
		</div>
		
		<!-- Modal Body -->
		<div class="text-center">
			<h3 class="text-lg font-medium text-gray-900 mb-2">{title}</h3>
			<p class="text-sm text-gray-500 mb-6">{message}</p>
		</div>
		
		<!-- Modal Footer -->
		<div class="flex items-center justify-center space-x-3">
			<button
				type="button"
				on:click={handleCancel}
				class="btn btn-secondary"
				disabled={loading}
			>
				{cancelText}
			</button>
			<button
				type="button"
				on:click={handleConfirm}
				class="btn btn-danger"
				disabled={loading}
			>
				{#if loading}
					<svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					Excluindo...
				{:else}
					{confirmText}
				{/if}
			</button>
		</div>
	</div>
</div>