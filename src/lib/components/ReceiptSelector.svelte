<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import Receipt from './Receipt.svelte';
	import ReceiptA4 from './ReceiptA4.svelte';
	
	const dispatch = createEventDispatcher();

	export let orderId: number;
	
	let settings: any = null;
	let loading = true;
	let error = '';

	async function loadSettings() {
		loading = true;
		error = '';
		
		try {
			const response = await fetch('/api/settings?public=true');
			const result = await response.json();
			
			if (result.settings) {
				settings = result.settings;
			} else {
				// Se não há configurações, usar valor padrão (bobina = false)
				settings = { receiptInBobina: false };
			}
		} catch (err) {
			console.error('Erro ao carregar configurações:', err);
			// Em caso de erro, usar valor padrão (bobina = false)
			settings = { receiptInBobina: false };
		} finally {
			loading = false;
		}
	}

	function handleClose() {
		dispatch('close');
	}

	onMount(() => {
		loadSettings();
	});
</script>

{#if loading}
	<!-- Loading State -->
	<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
		<div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
			<div class="flex items-center justify-center py-8">
				<svg class="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
				<span class="ml-2">Carregando configurações...</span>
			</div>
		</div>
	</div>
{:else if error}
	<!-- Error State -->
	<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
		<div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
			<div class="text-center py-8">
				<div class="text-red-600 mb-4">
					<svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<p class="text-gray-600 mb-4">{error}</p>
				<button
					on:click={handleClose}
					class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
				>
					Fechar
				</button>
			</div>
		</div>
	</div>
{:else if settings}
	<!-- Render appropriate receipt component based on settings -->
	{#if settings.receiptInBobina}
		<Receipt {orderId} on:close={handleClose} />
	{:else}
		<ReceiptA4 {orderId} on:close={handleClose} />
	{/if}
{/if}