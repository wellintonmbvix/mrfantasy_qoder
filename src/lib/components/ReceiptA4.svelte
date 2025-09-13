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
		const numbers = phone.replace(/\D/g, '');
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
			const receiptElement = document.getElementById('receipt-a4-content');
			if (receiptElement) {
				printWindow.document.write(`
					<html>
						<head>
							<title>Comprovante - ${receiptData?.order?.orderNumber}</title>
							<style>
								body {
									margin: 20mm;
									padding: 0;
									font-family: Arial, sans-serif;
									font-size: 11px;
									line-height: 1.4;
									color: #000;
									background: white;
								}
								.header {
									text-align: center;
									margin-bottom: 15px;
									border-bottom: 1px solid #000;
									padding-bottom: 10px;
								}
								.company-name {
									font-size: 16px;
									font-weight: bold;
									margin-bottom: 5px;
								}
								.company-info {
									font-size: 9px;
									margin: 2px 0;
								}
								.document-title {
									font-size: 14px;
									font-weight: bold;
									text-align: center;
									margin: 10px 0;
									text-decoration: underline;
								}
								.info-section {
									margin: 10px 0;
									padding: 8px;
									border: 1px solid #ccc;
									border-radius: 3px;
									background-color: #f9f9f9;
								}
								.info-section h3 {
									margin: 0 0 8px 0;
									font-weight: bold;
									font-size: 12px;
								}
								.info-row-group {
									display: flex;
									gap: 20px;
									margin: 3px 0;
								}
								.info-field {
									flex: 1;
								}
								.info-label {
									font-weight: bold;
									font-size: 9px;
								}
								.info-value {
									font-size: 9px;
									margin-left: 3px;
								}
								.items-table {
									width: 100%;
									border-collapse: collapse;
									margin: 20px 0;
									font-size: 9px;
								}
								.items-table th,
								.items-table td {
									border: 1px solid #000;
									padding: 6px;
									text-align: left;
								}
								.items-table th {
									background-color: #f0f0f0;
									font-weight: bold;
									font-size: 10px;
								}
								.items-table .text-right {
									text-align: right;
								}
								.items-table .text-center {
									text-align: center;
								}
								.totals-section {
									margin: 10px 0;
									padding: 8px;
									border: 1px solid #000;
									border-radius: 3px;
									background-color: #f9f9f9;
								}
								.totals-row {
									display: flex;
									gap: 20px;
									margin: 2px 0;
									font-size: 9px;
								}
								.totals-field {
									flex: 1;
								}
								.totals-label {
									font-weight: bold;
								}
								.totals-value {
									margin-left: 3px;
								}
								.totals-final {
									font-weight: bold;
									font-size: 11px;
								}
								.payment-section {
									margin: 6px 0 2px 0;
									border-top: 1px solid #000;
									padding-top: 6px;
									font-size: 9px;
								}
								.notes-section {
									margin: 10px 0;
									padding: 8px;
									border: 1px solid #ccc;
									border-radius: 3px;
									background-color: #fff9c4;
								}
								.notes-section h3 {
									margin: 0 0 6px 0;
									font-weight: bold;
									font-size: 11px;
								}
								.notes-content {
									font-size: 9px;
								}
								.notes-section {
									margin: 20px 0;
									padding: 15px;
									border: 1px solid #ccc;
									border-radius: 5px;
									background-color: #fff9c4;
								}
								.signature-section {
									margin-top: 20px;
									display: flex;
									justify-content: space-between;
								}
								.signature-box {
									text-align: center;
									width: 45%;
								}
								.signature-line {
									border-top: 1px solid #000;
									padding-top: 5px;
									font-size: 9px;
								}
								.watermark {
									position: fixed;
									top: 50%;
									left: 50%;
									transform: translate(-50%, -50%) rotate(-45deg);
									font-size: 80px;
									font-weight: bold;
									color: #dc2626;
									opacity: 0.2;
									pointer-events: none;
									z-index: 1000;
									user-select: none;
								}
								@page {
									size: A4;
									margin: 0;
								}
								@media print {
									body {
										print-color-adjust: exact;
										-webkit-print-color-adjust: exact;
									}
									.watermark {
										color: #dc2626 !important;
										opacity: 0.2 !important;
									}
								}
							</style>
						</head>
						<body>
							${receiptData.order.status === 'CANCELLED' ? '<div class="watermark">CANCELADO</div>' : ''}
							${receiptElement.innerHTML}
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
	<div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
		<!-- Modal Header -->
		<div class="flex items-center justify-between p-4 border-b">
			<h3 class="text-lg font-medium text-gray-900">
				Comprovante do Pedido (Formato A4)
			</h3>
			<!-- svelte-ignore a11y_consider_explicit_label -->
			<button
				on:click={() => dispatch('close')}
				class="text-gray-400 hover:text-gray-600"
				aria-label="Fechar comprovante"
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
				<div class="bg-gray-50 p-4 rounded-lg mb-4 max-h-[60vh] overflow-y-auto">
					<div id="receipt-a4-content" class="bg-white relative max-w-full" style="padding: 20mm; font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #000;">
						<!-- Watermark for cancelled orders -->
						{#if receiptData.order.status === 'CANCELLED'}
							<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; font-weight: bold; color: #dc2626; opacity: 0.2; pointer-events: none; z-index: 1000; user-select: none;">
								CANCELADO
							</div>
						{/if}

						<!-- Header -->
						<div style="text-align: center; margin-bottom: 15px; border-bottom: 1px solid #000; padding-bottom: 10px;">
							<div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">{receiptData.company.nomeFantasia}</div>
							<div style="font-size: 9px; margin: 2px 0;">
								{formatPhone(receiptData.company.telefone1)}
								{#if receiptData.company.telefone2}
									• {formatPhone(receiptData.company.telefone2)}
								{/if}
							</div>
							<div style="font-size: 9px; margin: 2px 0;">
								{receiptData.company.endereco}, {receiptData.company.numero}
								{#if receiptData.company.complemento}
									- {receiptData.company.complemento}
								{/if}
							</div>
							<div style="font-size: 9px; margin: 2px 0;">
								{receiptData.company.bairro} - {receiptData.company.cidade}/{receiptData.company.estado}
							</div>
						</div>

						<!-- Document Title -->
						<div style="font-size: 14px; font-weight: bold; text-align: center; margin: 10px 0; text-decoration: underline;">CONTROLE INTERNO</div>

						<!-- Order Information -->
						<div style="margin: 10px 0; padding: 8px; border: 1px solid #ccc; border-radius: 3px; background-color: #f9f9f9;">
							<h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 12px;">Informações do Pedido</h3>
							<div style="display: flex; gap: 20px; margin: 3px 0;">
								<div style="flex: 1;">
									<span style="font-weight: bold; font-size: 9px;">Número:</span>
									<span style="font-size: 9px; margin-left: 3px;">{receiptData.order.orderNumber}</span>
								</div>
								<div style="flex: 1;">
									<span style="font-weight: bold; font-size: 9px;">Emissão:</span>
									<span style="font-size: 9px; margin-left: 3px;">{formatDate(receiptData.order.orderDate)}</span>
								</div>
								{#if receiptData.attendant}
									<div style="flex: 1;">
										<span style="font-weight: bold; font-size: 9px;">Atendente:</span>
										<span style="font-size: 9px; margin-left: 3px;">{receiptData.attendant.name}</span>
									</div>
								{/if}
							</div>
							{#if receiptData.order.rentalStartDate || receiptData.order.rentalEndDate}
								<div style="display: flex; gap: 20px; margin: 3px 0;">
									{#if receiptData.order.rentalStartDate}
										<div style="flex: 1;">
											<span style="font-weight: bold; font-size: 9px;">Retirada:</span>
											<span style="font-size: 9px; margin-left: 3px;">{formatDate(receiptData.order.rentalStartDate)}</span>
										</div>
									{/if}
									{#if receiptData.order.rentalEndDate}
										<div style="flex: 1;">
											<span style="font-weight: bold; font-size: 9px;">Entrega:</span>
											<span style="font-size: 9px; margin-left: 3px;">{formatDate(receiptData.order.rentalEndDate)}</span>
										</div>
									{/if}
									<div style="flex: 1;"></div> <!-- Espaço vazio para manter alinhamento -->
								</div>
							{/if}
						</div>

						<!-- Customer Information -->
						<div style="margin: 10px 0; padding: 8px; border: 1px solid #ccc; border-radius: 3px; background-color: #f9f9f9;">
							<h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 12px;">Dados do Cliente</h3>
							{#if receiptData.customer}
								<div style="display: flex; gap: 20px; margin: 3px 0;">
									<div style="flex: 2;">
										<span style="font-weight: bold; font-size: 9px;">Nome:</span>
										<span style="font-size: 9px; margin-left: 3px;">{receiptData.customer.name}</span>
									</div>
									<div style="flex: 1;">
										<span style="font-weight: bold; font-size: 9px;">CPF:</span>
										<span style="font-size: 9px; margin-left: 3px;">{receiptData.customer.documentNumber}</span>
									</div>
								</div>
								<div style="display: flex; gap: 20px; margin: 3px 0;">
									<div style="flex: 2;">
										<span style="font-weight: bold; font-size: 9px;">Endereço:</span>
										<span style="font-size: 9px; margin-left: 3px;">{receiptData.customer.address}, {receiptData.customer.number}</span>
									</div>
									<div style="flex: 1;">
										<span style="font-weight: bold; font-size: 9px;">Bairro:</span>
										<span style="font-size: 9px; margin-left: 3px;">{receiptData.customer.neighborhood}</span>
									</div>
								</div>
								<div style="display: flex; gap: 20px; margin: 3px 0;">
									<div style="flex: 1;">
										<span style="font-weight: bold; font-size: 9px;">Cidade:</span>
										<span style="font-size: 9px; margin-left: 3px;">{receiptData.customer.city} - {receiptData.customer.state}</span>
									</div>
									<div style="flex: 1;">
										<span style="font-weight: bold; font-size: 9px;">Telefone:</span>
										<span style="font-size: 9px; margin-left: 3px;">{formatPhone(receiptData.customer.phone)}{#if receiptData.customer.phone2} / {formatPhone(receiptData.customer.phone2)}{/if}</span>
									</div>
								</div>
							{:else}
								<div style="margin: 3px 0;">
									<span style="font-weight: bold; font-size: 9px;">Cliente:</span>
									<span style="font-size: 9px; margin-left: 3px;">Consumidor Final</span>
								</div>
							{/if}
						</div>

						<!-- Items Table -->
						<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 9px;">
							<thead>
								<tr>
									<th style="width: 30%; border: 1px solid #000; padding: 8px; text-align: left; background-color: #f0f0f0; font-weight: bold; font-size: 10px;">Produto</th>
									<th style="width: 15%; border: 1px solid #000; padding: 8px; text-align: left; background-color: #f0f0f0; font-weight: bold; font-size: 10px;">Categoria</th>
									<th style="width: 8%; border: 1px solid #000; padding: 8px; text-align: center; background-color: #f0f0f0; font-weight: bold; font-size: 10px;">Qtde</th>
									<th style="width: 12%; border: 1px solid #000; padding: 8px; text-align: right; background-color: #f0f0f0; font-weight: bold; font-size: 10px;">Preço Unit.</th>
									<th style="width: 12%; border: 1px solid #000; padding: 8px; text-align: right; background-color: #f0f0f0; font-weight: bold; font-size: 10px;">Desconto</th>
									<th style="width: 12%; border: 1px solid #000; padding: 8px; text-align: right; background-color: #f0f0f0; font-weight: bold; font-size: 10px;">Total</th>
									<th style="width: 11%; border: 1px solid #000; padding: 8px; text-align: center; background-color: #f0f0f0; font-weight: bold; font-size: 10px;">Tipo</th>
								</tr>
							</thead>
							<tbody>
								{#each receiptData.items as item}
									<tr>
										<td style="border: 1px solid #000; padding: 6px; text-align: left;">{item.productName}</td>
										<td style="border: 1px solid #000; padding: 6px; text-align: left;">{item.productType}</td>
										<td style="border: 1px solid #000; padding: 6px; text-align: center;">{item.quantity}</td>
										<td style="border: 1px solid #000; padding: 6px; text-align: right;">{formatCurrency(item.unitPrice)}</td>
										<td style="border: 1px solid #000; padding: 6px; text-align: right;">{formatCurrency(item.discountValue)}</td>
										<td style="border: 1px solid #000; padding: 6px; text-align: right;">{formatCurrency(item.totalPrice)}</td>
										<td style="border: 1px solid #000; padding: 6px; text-align: center;">
											{#if item.itemType === 'SALE'}
												Venda
											{:else}
												Locação
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>

						<!-- Totals -->
						<div style="margin: 10px 0; padding: 8px; border: 1px solid #000; border-radius: 3px; background-color: #f9f9f9;">
							<div style="display: flex; gap: 20px; margin: 2px 0; font-size: 9px;">
								<div style="flex: 1;">
									<span style="font-weight: bold;">Qtde Total:</span>
									<span style="margin-left: 3px;">{receiptData.totals.totalItems}</span>
								</div>
								<div style="flex: 1;">
									<span style="font-weight: bold;">Subtotal:</span>
									<span style="margin-left: 3px;">{formatCurrency(receiptData.totals.subtotalAmount)}</span>
								</div>
								<div style="flex: 1;">
									<span style="font-weight: bold; font-size: 11px;">Total:</span>
									<span style="margin-left: 3px; font-weight: bold; font-size: 11px;">{formatCurrency(receiptData.totals.totalAmount)}</span>
								</div>
							</div>
							<div style="margin: 6px 0 2px 0; border-top: 1px solid #000; padding-top: 6px; font-size: 9px;">
								<span style="font-weight: bold;">Forma(s) de Pagamento:</span>
								<span style="margin-left: 3px;">
									{#each receiptData.paymentMethods as method, index}
										{method}{index < receiptData.paymentMethods.length - 1 ? ', ' : ''}
									{/each}
								</span>
							</div>
						</div>

						<!-- Notes -->
						{#if receiptData.order.notes}
							<div style="margin: 10px 0; padding: 8px; border: 1px solid #ccc; border-radius: 3px; background-color: #fff9c4;">
								<h3 style="margin: 0 0 6px 0; font-weight: bold; font-size: 11px;">Observações do Pedido:</h3>
								<div style="font-size: 9px;">{@html formatTextWithLineBreaks(receiptData.order.notes)}</div>
							</div>
						{/if}

						<!-- Rental Notes -->
						{#if receiptData.company.observacaoAluguel && receiptData.items.some((item: any) => item.itemType === 'RENTAL')}
							<div style="margin: 10px 0; padding: 8px; border: 1px solid #ccc; border-radius: 3px; background-color: #fff9c4;">
								<h3 style="margin: 0 0 6px 0; font-weight: bold; font-size: 11px;">Condições de Locação:</h3>
								<div style="font-size: 9px;">{@html formatTextWithLineBreaks(receiptData.company.observacaoAluguel)}</div>
							</div>
						{/if}

						<!-- Signature Section -->
						<div style="margin-top: 20px; display: flex; justify-content: space-between;">
							<div style="text-align: center; width: 45%;">
								<div style="border-top: 1px solid #000; padding-top: 5px; font-size: 9px;">Cliente</div>
							</div>
							<div style="text-align: center; width: 45%;">
								<div style="border-top: 1px solid #000; padding-top: 5px; font-size: 9px;">Responsável</div>
							</div>
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