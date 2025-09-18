import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/database';
import { requireRole } from '$lib/server/middleware';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Verificar se usuário tem permissão (ADMIN ou MANAGER)
	const roleCheck = requireRole(locals, 'MANAGER');
	if (!roleCheck.success) return roleCheck.response;

	try {
		// Parâmetros de filtro
		const dateFrom = url.searchParams.get('dateFrom');
		const dateTo = url.searchParams.get('dateTo');
		const customerId = url.searchParams.get('customerId');
		const attendantId = url.searchParams.get('attendantId');
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '50');

		// Construir where clause
		const where: any = {};

		// Filtro por data (obrigatório)
		if (dateFrom || dateTo) {
			where.orderDate = {};
			if (dateFrom) {
				where.orderDate.gte = new Date(dateFrom + 'T00:00:00.000Z');
			}
			if (dateTo) {
				where.orderDate.lte = new Date(dateTo + 'T23:59:59.999Z');
			}
		}

		// Filtro por cliente (opcional)
		if (customerId && !isNaN(parseInt(customerId))) {
			where.customerId = parseInt(customerId);
		}

		// Filtro por atendente (opcional)
		if (attendantId && !isNaN(parseInt(attendantId))) {
			where.attendantId = parseInt(attendantId);
		}

		// Buscar pedidos com todos os relacionamentos necessários
		const [orders, total] = await Promise.all([
			prisma.order.findMany({
				where,
				include: {
					customer: {
						select: {
							id: true,
							name: true,
							phone: true,
							email: true
						}
					},
					attendant: {
						select: {
							id: true,
							name: true,
							abbreviation: true
						}
					},
					orderItems: {
						include: {
							product: {
								select: {
									id: true,
									name: true,
									sku: true
								}
							}
						}
					},
					orderPayments: {
						include: {
							paymentMethod: {
								select: {
									id: true,
									name: true
								}
							}
						}
					}
				},
				orderBy: { orderDate: 'desc' },
				skip: (page - 1) * limit,
				take: limit
			}),
			prisma.order.count({ where })
		]);

		// Calcular totais por forma de pagamento
		const paymentMethodTotals: Record<string, number> = {};
		
		orders.forEach(order => {
			order.orderPayments.forEach(payment => {
				const methodName = payment.paymentMethod.name;
				paymentMethodTotals[methodName] = (paymentMethodTotals[methodName] || 0) + Number(payment.amount);
			});
		});

		// Formatar dados de resposta
		const formattedOrders = orders.map(order => ({
			id: order.id,
			orderNumber: order.orderNumber,
			orderDate: order.orderDate,
			customer: order.customer,
			attendant: order.attendant,
			status: order.status,
			subtotalAmount: Number(order.subtotalAmount),
			discountType: order.discountType,
			discountValue: Number(order.discountValue || 0),
			surchargeType: order.surchargeType,
			surchargeValue: Number(order.surchargeValue || 0),
			totalAmount: Number(order.totalAmount),
			notes: order.notes,
			// Calcular totais dos itens
			itemsSubtotal: order.orderItems.reduce((sum, item) => sum + (Number(item.unitPrice) * item.quantity), 0),
			itemsDiscount: order.orderItems.reduce((sum, item) => {
				const itemDiscount = item.discountType === 'PERCENTAGE' 
					? (Number(item.unitPrice) * item.quantity * Number(item.discountValue || 0)) / 100
					: Number(item.discountValue || 0);
				return sum + itemDiscount;
			}, 0),
			itemsTotal: order.orderItems.reduce((sum, item) => sum + Number(item.totalPrice), 0),
			totalQuantity: order.orderItems.reduce((sum, item) => sum + item.quantity, 0),
			orderItems: order.orderItems.map(item => ({
				id: item.id,
				product: item.product,
				quantity: item.quantity,
				unitPrice: Number(item.unitPrice),
				discountType: item.discountType,
				discountValue: Number(item.discountValue || 0),
				surchargeType: item.surchargeType,
				surchargeValue: Number(item.surchargeValue || 0),
				totalPrice: Number(item.totalPrice),
				itemType: item.itemType,
				itemTaken: item.itemTaken,
				itemReturned: item.itemReturned,
				status: item.itemTaken && item.itemReturned ? 'RETORNADO' : 
				        item.itemTaken ? 'RETIRADO' : 'PENDENTE',
				// Para itens SALE, mostrar informação adicional
				saleInfo: item.itemType === 'SALE' ? 'Item vendido' : null
			})),
			orderPayments: order.orderPayments.map(payment => ({
				id: payment.id,
				paymentMethod: payment.paymentMethod,
				amount: Number(payment.amount),
				notes: payment.notes
			}))
		}));

		// Calcular totais gerais
		const summary = {
			totalOrders: total,
			totalAmount: formattedOrders.reduce((sum, order) => sum + order.totalAmount, 0),
			totalItems: formattedOrders.reduce((sum, order) => sum + order.totalQuantity, 0),
			totalDiscount: formattedOrders.reduce((sum, order) => sum + order.itemsDiscount, 0),
			paymentMethodTotals
		};

		return json({
			success: true,
			data: formattedOrders,
			summary,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
				hasNext: page < Math.ceil(total / limit),
				hasPrev: page > 1
			}
		});

	} catch (error) {
		console.error('Erro ao gerar relatório de pedidos:', error);
		return json(
			{ 
				success: false, 
				error: 'Erro interno do servidor ao gerar relatório' 
			}, 
			{ status: 500 }
		);
	}
};