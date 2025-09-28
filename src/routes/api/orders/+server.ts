import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/database.js';
import { z } from 'zod';
import { calculateDiscount, applyDiscount, distributeOrderDiscount, calculateSurcharge, applySurcharge, distributeOrderSurcharge } from '$lib/utils/validation.js';
import { createAuditLog } from '$lib/server/auditLog.js'; // Importando serviço de auditoria

// Interface for processed order items
interface ProcessedOrderItem {
	productId: number;
	quantity: number;
	unitPrice: number;
	discountType?: 'PERCENTAGE' | 'FIXED';
	discountValue?: number;
	surchargeType?: 'PERCENTAGE' | 'FIXED';
	surchargeValue?: number;
	itemType: 'RENTAL' | 'SALE';
	itemTaken?: boolean;
	itemReturned?: boolean;
	totalPrice: number;
}

// Use consistent validation schema
const OrderItemSchema = z.object({
	productId: z.number().int().positive('ID do produto deve ser positivo'),
	quantity: z.number().int().min(1, 'Quantidade deve ser pelo menos 1'),
	unitPrice: z.number().min(0, 'Preço unitário deve ser positivo'),
	discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
	discountValue: z.number().min(0, 'Valor do desconto deve ser positivo').optional(),
	surchargeType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
	surchargeValue: z.number().min(0, 'Valor do acréscimo deve ser positivo').optional(),
	itemType: z.enum(['RENTAL', 'SALE']),
	// itemTaken será automaticamente definido como true se:
	// 1. itemType é 'SALE', OU
	// 2. itemType é 'RENTAL' E rentalStartDate igual a orderDate
	itemTaken: z.boolean().optional().default(false),
	itemReturned: z.boolean().optional().default(false)
}).refine((data) => {
	// Se há desconto, o tipo deve ser especificado
	return !data.discountValue || data.discountType;
}, {
	message: 'Tipo de desconto é obrigatório quando há valor de desconto',
	path: ['discountType']
}).refine((data) => {
	// Se o tipo é percentual, o valor não pode ser maior que 100
	return data.discountType !== 'PERCENTAGE' || !data.discountValue || data.discountValue <= 100;
}, {
	message: 'Desconto percentual não pode ser maior que 100%',
	path: ['discountValue']
}).refine((data) => {
	// Se há acréscimo, o tipo deve ser especificado
	return !data.surchargeValue || data.surchargeType;
}, {
	message: 'Tipo de acréscimo é obrigatório quando há valor de acréscimo',
	path: ['surchargeType']
}).refine((data) => {
	// Se o tipo é percentual, o valor não pode ser maior que 100
	return data.surchargeType !== 'PERCENTAGE' || !data.surchargeValue || data.surchargeValue <= 100;
}, {
	message: 'Acréscimo percentual não pode ser maior que 100%',
	path: ['surchargeValue']
});

const OrderPaymentSchema = z.object({
	paymentMethodId: z.number().int().positive('ID do meio de pagamento deve ser positivo'),
	amount: z.number().min(0.01, 'Valor do pagamento deve ser maior que zero'),
	notes: z.string().optional()
});

const OrderSchema = z.object({
	customerId: z.number().int().positive('ID do cliente deve ser positivo').optional(),
	attendantId: z.number().int().positive('ID do atendente deve ser positivo'),
	orderDate: z.string().transform((str) => new Date(str)),
	rentalStartDate: z.string().transform((str) => new Date(str)).optional(),
	rentalEndDate: z.string().transform((str) => new Date(str)).optional(),
	notes: z.string().optional(),
	discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
	discountValue: z.number().min(0, 'Valor do desconto deve ser positivo').optional(),
	surchargeType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
	surchargeValue: z.number().min(0, 'Valor do acréscimo deve ser positivo').optional(),
	items: z.array(OrderItemSchema).min(1, 'Pelo menos um item é obrigatório'),
	payments: z.array(OrderPaymentSchema).min(1, 'Pelo menos um meio de pagamento é obrigatório')
}).refine((data) => {
	// Cliente é obrigatório quando há pelo menos um item do tipo aluguel
	return !data.items.some(item => item.itemType === 'RENTAL') || data.customerId !== undefined;
}, {
	message: 'Cliente é obrigatório quando há itens de aluguel',
	path: ['customerId']
}).refine((data) => {
	// Se há desconto no pedido, o tipo deve ser especificado
	return !data.discountValue || data.discountType;
}, {
	message: 'Tipo de desconto é obrigatório quando há valor de desconto',
	path: ['discountType']
}).refine((data) => {
	// Se o tipo é percentual, o valor não pode ser maior que 100
	return data.discountType !== 'PERCENTAGE' || !data.discountValue || data.discountValue <= 100;
}, {
	message: 'Desconto percentual do pedido não pode ser maior que 100%',
	path: ['discountValue']
}).refine((data) => {
	// Se há acréscimo no pedido, o tipo deve ser especificado
	return !data.surchargeValue || data.surchargeType;
}, {
	message: 'Tipo de acréscimo é obrigatório quando há valor de acréscimo',
	path: ['surchargeType']
}).refine((data) => {
	// Se o tipo é percentual, o valor não pode ser maior que 100
	return data.surchargeType !== 'PERCENTAGE' || !data.surchargeValue || data.surchargeValue <= 100;
}, {
	message: 'Acréscimo percentual do pedido não pode ser maior que 100%',
	path: ['surchargeValue']
});

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const search = url.searchParams.get('search') || '';
		const status = url.searchParams.get('status') || '';
		const orderDateFrom = url.searchParams.get('orderDateFrom');
		const rentalStartDateFrom = url.searchParams.get('rentalStartDateFrom');
		const returnDateFrom = url.searchParams.get('returnDateFrom');
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '10');
		const skip = (page - 1) * limit;

		// Build date filters
		const dateFilters = [];
		if (orderDateFrom) {
			try {
				const fromDate = new Date(orderDateFrom);
				if (!isNaN(fromDate.getTime())) {
					dateFilters.push({ orderDate: { gte: fromDate } });
				}
			} catch (e) {
				// Invalid date, ignore
			}
		}
		if (rentalStartDateFrom) {
			try {
				const fromDate = new Date(rentalStartDateFrom);
				if (!isNaN(fromDate.getTime())) {
					dateFilters.push({ rentalStartDate: { gte: fromDate } });
				}
			} catch (e) {
				// Invalid date, ignore
			}
		}
		if (returnDateFrom) {
			try {
				const fromDate = new Date(returnDateFrom);
				if (!isNaN(fromDate.getTime())) {
					dateFilters.push({ returnDate: { gte: fromDate } });
				}
			} catch (e) {
				// Invalid date, ignore
			}
		}

		const where = {
			...(search && {
				OR: [
					{ orderNumber: { contains: search } },
					{ customer: { name: { contains: search } } },
					{ customer: { email: { contains: search } } }
				]
			}),
			...(status && { status: status as any }),
			...(dateFilters.length > 0 && { AND: dateFilters })
		};

		const [orders, total] = await Promise.all([
			prisma.order.findMany({
				where,
				include: {
					customer: {
						select: {
							id: true,
							name: true,
							email: true,
							phone: true
						}
					},
					user: {
						select: {
							id: true,
							username: true
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
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' }
			}),
			prisma.order.count({ where })
		]);

		// Serialize Decimal fields to numbers
		const serializedOrders = orders.map(order => ({
			...order,
			subtotalAmount: Number(order.subtotalAmount),
			totalAmount: Number(order.totalAmount),
			discountValue: order.discountValue ? Number(order.discountValue) : null,
			orderItems: order.orderItems.map(item => ({
				...item,
				unitPrice: Number(item.unitPrice),
				totalPrice: Number(item.totalPrice),
				discountValue: item.discountValue ? Number(item.discountValue) : null
			})),
			orderPayments: order.orderPayments.map(payment => ({
				...payment,
				amount: Number(payment.amount)
			}))
		}));

		return json({
			orders: serializedOrders,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit)
			}
		});
	} catch (error) {
		console.error('Erro ao buscar pedidos:', error);
		return json({ error: 'Erro ao buscar pedidos' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const data = await request.json();
		const validatedData = OrderSchema.parse(data);

		// Generate order number
		const orderNumber = `PED-${Date.now()}`;

		// Process items and calculate totals
		const processedItems: ProcessedOrderItem[] = [];
		let subtotalAmount = 0;

		for (const item of validatedData.items) {
			// Validate product
			const product = await prisma.product.findUnique({
				where: { id: item.productId }
			});

			if (!product || !product.active) {
				return json(
					{ error: `Produto ID ${item.productId} não encontrado ou inativo` },
					{ status: 400 }
				);
			}

			// Check stock for SALE items
			if (item.itemType === 'SALE' && product.stockQuantity < item.quantity) {
				return json(
					{ error: `Estoque insuficiente para o produto ${product.name}` },
					{ status: 400 }
				);
			}

			// For RENTAL items, check if rental dates are provided
			if (item.itemType === 'RENTAL' && (!validatedData.rentalStartDate || !validatedData.rentalEndDate)) {
				return json(
					{ error: 'Datas de início e fim do aluguel são obrigatórias para itens de aluguel' },
					{ status: 400 }
				);
			}

			// Calculate item total
			let itemTotal = item.unitPrice * item.quantity;

			// Apply discount
			if (item.discountType && item.discountValue) {
				itemTotal = applyDiscount(itemTotal, item.discountType, item.discountValue);
			}

			// Apply surcharge
			if (item.surchargeType && item.surchargeValue) {
				itemTotal = applySurcharge(itemTotal, item.surchargeType, item.surchargeValue);
			}

			subtotalAmount += itemTotal;
			processedItems.push({
				productId: item.productId,
				quantity: item.quantity,
				unitPrice: item.unitPrice,
				discountType: item.discountType,
				discountValue: item.discountValue,
				surchargeType: item.surchargeType,
				surchargeValue: item.surchargeValue,
				itemType: item.itemType,
				itemTaken: item.itemTaken,
				itemReturned: item.itemReturned,
				totalPrice: itemTotal
			});
		}

		// Apply order discount
		let totalAmount = subtotalAmount;
		if (validatedData.discountType && validatedData.discountValue) {
			const orderDiscount = calculateDiscount(subtotalAmount, validatedData.discountType, validatedData.discountValue);
			totalAmount = subtotalAmount - orderDiscount;
		}

		// Apply order surcharge
		if (validatedData.surchargeType && validatedData.surchargeValue) {
			const orderSurcharge = calculateSurcharge(totalAmount, validatedData.surchargeType, validatedData.surchargeValue);
			totalAmount = totalAmount + orderSurcharge;
		}

		// Validate customer if provided
		if (validatedData.customerId) {
			const customer = await prisma.customer.findUnique({
				where: { id: validatedData.customerId }
			});

			if (!customer || !customer.active) {
				return json(
					{ error: `Cliente ID ${validatedData.customerId} não encontrado ou inativo` },
					{ status: 400 }
				);
			}
		}

		// Validate attendant
		const attendant = await prisma.employee.findUnique({
			where: { id: validatedData.attendantId }
		});

		if (!attendant || !attendant.active) {
			return json(
				{ error: `Atendente ID ${validatedData.attendantId} não encontrado ou inativo` },
				{ status: 400 }
			);
		}

		// Validate payment methods
		for (const payment of validatedData.payments) {
			const paymentMethod = await prisma.paymentMethod.findUnique({
				where: { id: payment.paymentMethodId }
			});

			if (!paymentMethod || !paymentMethod.active) {
				return json(
					{ error: `Meio de pagamento ID ${payment.paymentMethodId} não encontrado ou inativo` },
					{ status: 400 }
				);
			}
		}

		// Validate payment total
		const totalPayments = validatedData.payments.reduce((sum, payment) => sum + payment.amount, 0);
		if (Math.abs(totalAmount - totalPayments) > 0.01) {
			return json(
				{ error: `Total dos pagamentos (R$ ${totalPayments.toFixed(2)}) deve ser igual ao total do pedido (R$ ${totalAmount.toFixed(2)})` },
				{ status: 400 }
			);
		}

		// Determine order status based on items
		// If all items are SALE type, mark order as CONFIRMED
		// If has any RENTAL items, keep as PENDING
		const allItemsAreSale = processedItems.every(item => item.itemType === 'SALE');
		const hasRentalItems = processedItems.some(item => item.itemType === 'RENTAL');

		const orderStatus = allItemsAreSale ? 'CONFIRMED' : 'PENDING';

		// Create order in a transaction
		const order = await prisma.$transaction(async (tx: any) => {
			// Create the order
			const newOrder = await tx.order.create({
				data: {
					customerId: validatedData.customerId || null,
					userId: locals.user!.id,
					attendantId: validatedData.attendantId,
					orderNumber,
					subtotalAmount,
					discountType: validatedData.discountType || null,
					discountValue: validatedData.discountValue || null,
					surchargeType: validatedData.surchargeType || null,
					surchargeValue: validatedData.surchargeValue || null,
					totalAmount,
					orderDate: validatedData.orderDate,
					rentalStartDate: validatedData.rentalStartDate,
					rentalEndDate: validatedData.rentalEndDate,
					notes: validatedData.notes || '',
					status: orderStatus
				}
			});

			// Create order items and update stock
			for (const item of processedItems) {
				// Calculate item total price with discount and surcharge
				let itemTotalPrice = item.unitPrice * item.quantity;

				// Apply discount first
				if (item.discountType && item.discountValue && item.discountValue > 0) {
					itemTotalPrice = applyDiscount(itemTotalPrice, item.discountType, item.discountValue);
				}

				// Then apply surcharge
				if (item.surchargeType && item.surchargeValue && item.surchargeValue > 0) {
					itemTotalPrice = applySurcharge(itemTotalPrice, item.surchargeType, item.surchargeValue);
				}

				// Determine if item should be automatically marked as taken
				let itemTaken = item.itemTaken || false;

				// Rule: Auto-set itemTaken to true if:
				// 1. item_type is 'SALE', OR
				// 2. item_type is 'RENTAL' AND rental_start_date equals order_date
				if (item.itemType === 'SALE') {
					itemTaken = true;
				} else if (item.itemType === 'RENTAL' && validatedData.rentalStartDate) {
					// Compare dates (ignore time component)
					const orderDateOnly = new Date(validatedData.orderDate.getFullYear(), validatedData.orderDate.getMonth(), validatedData.orderDate.getDate());
					const rentalStartDateOnly = new Date(validatedData.rentalStartDate.getFullYear(), validatedData.rentalStartDate.getMonth(), validatedData.rentalStartDate.getDate());

					if (orderDateOnly.getTime() === rentalStartDateOnly.getTime()) {
						itemTaken = true;
					}
				}

				await tx.orderItem.create({
					data: {
						orderId: newOrder.id,
						productId: item.productId,
						quantity: item.quantity,
						unitPrice: item.unitPrice,
						discountType: item.discountType || null,
						discountValue: item.discountValue || null,
						surchargeType: item.surchargeType || null,
						surchargeValue: item.surchargeValue || null,
						totalPrice: itemTotalPrice,
						itemType: item.itemType,
						itemTaken: itemTaken,
						itemReturned: item.itemReturned || false
					}
				});

				// Update product stock
				await tx.product.update({
					where: { id: item.productId },
					data: {
						stockQuantity: {
							decrement: item.quantity
						}
					}
				});

				// Create inventory log
				await tx.inventoryLog.create({
					data: {
						productId: item.productId,
						quantityChange: -item.quantity,
						operationType: hasRentalItems ? 'RENTAL' : 'SALE',
						reason: `${hasRentalItems ? 'Aluguel' : 'Venda'} - Pedido ${orderNumber}`,
						userId: locals.user!.id
					}
				});
			}

			// Create order payments
			for (const payment of validatedData.payments) {
				await tx.orderPayment.create({
					data: {
						orderId: newOrder.id,
						paymentMethodId: payment.paymentMethodId,
						amount: payment.amount,
						notes: payment.notes || ''
					}
				});
			}

			return newOrder;
		});

		// Return the created order with relations
		const createdOrder = await prisma.order.findUnique({
			where: { id: order.id },
			include: {
				customer: true,
				user: {
					select: {
						id: true,
						username: true
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
						product: true
					}
				},
				orderPayments: {
					include: {
						paymentMethod: true
					}
				}
			}
		});

		// Serialize Decimal fields to numbers
		const serializedCreatedOrder = {
			...createdOrder,
			subtotalAmount: Number(createdOrder!.subtotalAmount),
			totalAmount: Number(createdOrder!.totalAmount),
			discountValue: createdOrder!.discountValue ? Number(createdOrder!.discountValue) : null,
			surchargeValue: createdOrder!.surchargeValue ? Number(createdOrder!.surchargeValue) : null,
			orderItems: createdOrder!.orderItems.map(item => ({
				...item,
				unitPrice: Number(item.unitPrice),
				totalPrice: Number(item.totalPrice),
				discountValue: item.discountValue ? Number(item.discountValue) : null,
				surchargeValue: item.surchargeValue ? Number(item.surchargeValue) : null,
				product: {
					...item.product,
					costPrice: Number(item.product.costPrice),
					rentalPrice: Number(item.product.rentalPrice),
					salePrice: Number(item.product.salePrice)
				}
			})),
			orderPayments: createdOrder!.orderPayments.map(payment => ({
				...payment,
				amount: Number(payment.amount)
			}))
		};

		// Registrar log de auditoria para criação
		try {
			if (locals.user) {
				await createAuditLog({
					module: 'orders',
					actionType: 'CREATE',
					newData: serializedCreatedOrder,
					userId: locals.user.id
				});
			}
		} catch (logError) {
			console.error('Erro ao registrar log de auditoria:', logError);
		}

		return json(serializedCreatedOrder, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return json(
				{ error: 'Dados inválidos', details: error.errors },
				{ status: 400 }
			);
		}

		console.error('Error creating order:', error);
		return json({ error: 'Erro ao criar pedido' }, { status: 500 });
	}
};