<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	const dispatch = createEventDispatcher();

	export let orderId: number;
	
	let receiptData: any = null;
	let loading = true;
	let error = '';

	async function loadReceiptData() {
		loading = true;
		error = '';
		
		try {
			const response = await fetch(`/api/orders/${orderId}/receipt`);
			const result = await response.json();
			
			if (result.success) {
				receiptData = result.data;
			} else {
				error = result.error || 'Erro ao carregar dados do comprovante';
			}
		} catch (err) {
			error = 'Erro ao conectar com o servidor';
			console.error('Erro ao buscar dados do comprovante:', err);
		} finally {
			loading = false;
		}
	}

	function formatDate(dateString: string | null) {
		if (!dateString) return '';
		const date = new Date(dateString);
		// Formatação com ano de 2 dígitos
		const day = date.getDate().toString().padStart(2, '0');
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const year = date.getFullYear().toString();
		return `${day}/${month}/${year}`;
	}

	function formatCurrency(value: number) {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL'
		}).format(value);
	}

	function formatPhone(phone: string | null) {
		if (!phone) return '';
		// Remove tudo que não é número
		const numbers = phone.replace(/\D/g, '');
		// Formata como (xx) xxxxx-xxxx ou (xx) xxxx-xxxx
		if (numbers.length === 11) {
			return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
		} else if (numbers.length === 10) {
			return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
		}
		return phone;
	}

	function formatTextWithLineBreaks(text: string | null) {
		if (!text) return '';
		return text.replace(/\n/g, '<br>');
	}

	function printReceipt() {
		const printWindow = window.open('', '_blank');
		if (printWindow) {
			const receiptElement = document.getElementById('receipt-content');
			if (receiptElement) {
				printWindow.document.write(`
					<html>
						<head>
							<title>Comprovante - ${receiptData?.order?.orderNumber}</title>
							<style>
								body {
									margin: 0;
									padding: 10px;
									font-family: 'Courier New', monospace;
									font-size: 12px;
									line-height: 1.2;
									width: 80mm;
									max-width: 80mm;
									position: relative;
								}
								.text-right {
									text-align: right;
								}
								.receipt {
									width: 100%;
								}
								.center {
									text-align: center;
								}
								.separator {
									border-top: 1px dashed #000;
									margin: 8px 0;
								}
								.line {
									margin: 2px 0;
								}
								.item-line {
									margin: 1px 0;
								}
								.signature-area {
									margin-top: 20px;
									border-top: 1px solid #000;
									padding-top: 5px;
								}
								.watermark {
									position: absolute;
									top: 50%;
									left: 50%;
									transform: translate(-50%, -50%) rotate(-45deg);
									font-size: 30px;
									font-weight: bold;
									color: #dc2626;
									opacity: 0.3;
									pointer-events: none;
									z-index: 10;
									user-select: none;
								}
								@page {
									size: 80mm auto;
									margin: 0;
								}
								@media print {
									body {
										print-color-adjust: exact;
										-webkit-print-color-adjust: exact;
									}
									.watermark {
										color: #dc2626 !important;
										opacity: 0.3 !important;
									}
								}
							</style>
						</head>
						<body>
							<div style="position: relative;">
								${receiptData.order.status === 'CANCELLED' ? '<div class="watermark">CANCELADO</div>' : ''}
								${receiptElement.innerHTML}
							</div>
						</body>
					</html>
				`);
				printWindow.document.close();
				printWindow.print();
			}
		}
	}

	// Carregar dados quando o componente é montado
	$: if (orderId) {
		loadReceiptData();
	}
</script>

<!-- Modal Background -->
<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
	<div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
		<!-- Modal Header -->
		<div class="flex items-center justify-between p-4 border-b">
			<h3 class="text-lg font-medium text-gray-900">
				Comprovante do Pedido
			</h3>
			<!-- svelte-ignore a11y_consider_explicit_label -->
			<button
				on:click={() => dispatch('close')}
				class="text-gray-400 hover:text-gray-600"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Modal Content -->
		<div class="p-4">
			{#if loading}
				<div class="flex items-center justify-center py-8">
					<svg class="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					<span class="ml-2">Carregando dados...</span>
				</div>
			{:else if error}
				<div class="text-center py-8">
					<div class="text-red-600 mb-4">
						<svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<p class="text-gray-600">{error}</p>
				</div>
			{:else if receiptData}
				<!-- Receipt Preview -->
				<div class="bg-gray-50 p-4 rounded-lg mb-4">
					<div id="receipt-content" class="bg-white p-4 font-mono text-xs leading-tight relative" style="width: 80mm; max-width: 80mm;">
						<!-- Watermark for cancelled orders -->
						{#if receiptData.order.status === 'CANCELLED'}
							<div class="absolute inset-0 flex items-center justify-center pointer-events-none" style="z-index: 10;">
								<div class="text-red-500 text-4xl font-bold opacity-30 transform rotate-[-45deg] select-none">
									CANCELADO
								</div>
							</div>
						{/if}
						<!-- Company Header -->
						<div style="text-align: center;">
							<div style="margin: 2px 0; font-weight: bold;">{receiptData.company.nomeFantasia}</div>
							<div style="margin: 2px 0;">
								{formatPhone(receiptData.company.telefone1)}
								{#if receiptData.company.telefone2}
									 {formatPhone(receiptData.company.telefone2)}
								{/if}
							</div>
							<div style="margin: 2px 0;">
								{receiptData.company.endereco}, {receiptData.company.numero}
							</div>
							<div style="margin: 2px 0;">
								{#if receiptData.company.complemento}
									{receiptData.company.complemento} - 
								{/if}
								{receiptData.company.bairro}
							</div>
							<div style="margin: 2px 0;">
								{receiptData.company.cidade} - {receiptData.company.estado}
							</div>
						</div>

						<div style="border-top: 1px dashed #000; margin: 8px 0;"></div>

						<!-- Document Title -->
						<div style="text-align: center;">
							<div style="margin: 2px 0; font-weight: bold;">CONTROLE INTERNO</div>
						</div>
						<div style="margin: 2px 0;">Emissão: {formatDate(receiptData.order.orderDate)}<span style="float: right;">Nro.: {receiptData.order.orderNumber}</span></div>
						{#if receiptData.order.rentalStartDate || receiptData.order.rentalEndDate}
							<div style="margin: 2px 0;">
								Retirada: {formatDate(receiptData.order.rentalStartDate)}<span style="float: right;">Entrega: {formatDate(receiptData.order.rentalEndDate)}</span>
							</div>
						{/if}
						{#if receiptData.attendant}
							<div style="margin: 2px 0;">Atendente: {receiptData.attendant.name}</div>
						{/if}

						<div style="border-top: 1px dashed #000; margin: 8px 0;"></div>

						<!-- Customer Info -->
						{#if receiptData.customer}
							<div style="margin: 2px 0;">Cliente: {receiptData.customer.name}</div>
							<div style="margin: 2px 0;">End.: {receiptData.customer.address}, {receiptData.customer.number}</div>
							<div style="margin: 2px 0;">Bairro: {receiptData.customer.neighborhood}</div>
							<div style="margin: 2px 0;">Cidade: {receiptData.customer.city} - {receiptData.customer.state}</div>
							<div style="margin: 2px 0;">
								Tel.: {formatPhone(receiptData.customer.phone)}
								{#if receiptData.customer.phone2}
									/ {formatPhone(receiptData.customer.phone2)}
								{/if}
							</div>
							<div style="margin: 2px 0;">CPF: {receiptData.customer.documentNumber}</div>
						{:else}
							<div style="margin: 2px 0;">Cliente: Consumidor Final</div>
						{/if}

						<div style="border-top: 1px dashed #000; margin: 8px 0;"></div>

						<!-- Items Header -->
						<div style="margin: 2px 0; font-weight: bold;">Produto<span style="float: right;">Tipo</span></div>
						<div style="margin: 2px 0 24px 0; font-weight: bold;"><span style="float: right;">Qtde    Preço Unit.   R$ Desc    Total</span></div>

						<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>

						<!-- Items -->
						{#each receiptData.items as item}
							<div style="margin: 2px 0;">{item.productName}<span style="float: right;">{item.productType}</span></div>
							<div style="margin: 2px 0; text-align: right;">
								{item.quantity}    {formatCurrency(item.unitPrice)}   {formatCurrency(item.discountValue)}    {formatCurrency(item.totalPrice)}
							</div>
							{#if item.itemType === 'SALE'}
								<div style="margin: 2px 0; text-align: right;">Item vendido</div>
							{/if}
						{/each}

						<div style="border-top: 1px dashed #000; margin: 8px 0;"></div>

						<!-- Totals -->
						<div style="margin: 2px 0;"><span style="font-weight: bold;">Qtde. Total de Itens:</span><span style="float: right;">{receiptData.totals.totalItems}</span></div>
						<div style="margin: 2px 0;"><span style="font-weight: bold;">Valor Total R$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span><span style="float: right;">{formatCurrency(receiptData.totals.totalAmount)}</span></div>
						<div style="margin: 2px 0;"><span style="font-weight: bold;">Forma(s) de Pagto.&nbsp;&nbsp;:&nbsp;</span>
							{#each receiptData.paymentMethods as method, index}
								{method}{index < receiptData.paymentMethods.length - 1 ? ', ' : ''}
							{/each}
						</div>

						{#if receiptData.order.notes}
							<div style="margin-top: 8px; margin-bottom: 2px;">
								{@html formatTextWithLineBreaks(receiptData.order.notes)}
							</div>
						{/if}

						{#if receiptData.company.observacaoAluguel}
							<!-- Só exibe observação de aluguel se houver algum item RENTAL -->
							{#if receiptData.items.some((item: any) => item.itemType === 'RENTAL')}
								<div style="margin-top: 8px; margin-bottom: 22px;">
									{@html formatTextWithLineBreaks(receiptData.company.observacaoAluguel)}
								</div>
							{/if}
						{/if}

						<div style="border-top: 1px dashed #000; margin: 25px 0 8px 0;"></div>

						<!-- Signature -->
						<div style="text-align: center;">
							<div style="margin: 2px 0; font-weight: bold;">Assinatura</div>
						</div>
						<div style="margin-top: 20px; border-top: 1px solid #000; padding-top: 5px; height: 15px;">
							&nbsp;
						</div>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex gap-2">
					<button
						on:click={printReceipt}
						class="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
					>
						<svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
						</svg>
						Imprimir
					</button>
					<button
						on:click={() => dispatch('close')}
						class="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
					>
						Fechar
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>