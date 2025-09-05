import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/database.js';
import { z } from 'zod';
import { calculateDiscount, applyDiscount, distributeOrderDiscount } from '$lib/utils/validation.js';

// Use consistent validation schema
const OrderItemSchema = z.object({
	productId: z.number().int().positive('ID do produto deve ser positivo'),
	quantity: z.number().int().min(1, 'Quantidade deve ser pelo menos 1'),
	unitPrice: z.number().min(0, 'Preço unitário deve ser positivo'),
	discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
	discountValue: z.number().min(0, 'Valor do desconto deve ser positivo').optional(),
	itemType: z.enum(['RENTAL', 'SALE']),
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
});

const OrderPaymentSchema = z.object({
	paymentMethodId: z.number().int().positive('ID do meio de pagamento deve ser positivo'),
	amount: z.number().min(0.01, 'Valor do pagamento deve ser maior que zero'),
	notes: z.string().optional()
});

const OrderSchema = z.object({
	customerId: z.number().int().positive('ID do cliente deve ser positivo').optional(),
	attendantId: z.number().int().positive('ID do atendente deve ser positivo'),
	orderType: z.enum(['RENTAL', 'SALE']),
	orderDate: z.string().transform((str) => new Date(str)),
	rentalStartDate: z.string().transform((str) => new Date(str)).optional(),
	rentalEndDate: z.string().transform((str) => new Date(str)).optional(),
	notes: z.string().optional(),
	discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
	discountValue: z.number().min(0, 'Valor do desconto deve ser positivo').optional(),
	items: z.array(OrderItemSchema).min(1, 'Pelo menos um item é obrigatório'),
	payments: z.array(OrderPaymentSchema).min(1, 'Pelo menos um meio de pagamento é obrigatório')
}).refine((data) => {
	// Cliente é obrigatório apenas para aluguéis
	return data.orderType !== 'RENTAL' || data.customerId !== undefined;
}, {
	message: 'Cliente é obrigatório para pedidos de aluguel',
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
});

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const search = url.searchParams.get('search') || '';
		const status = url.searchParams.get('status') || '';
		const orderType = url.searchParams.get('orderType') || '';
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '10');
		const skip = (page - 1) * limit;

		const where = {
			...(search && {
				OR: [
					{ orderNumber: { contains: search } },
					{ customer: { name: { contains: search } } },
					{ customer: { email: { contains: search } } }
				]
			}),
			...(status && { status: status as any }),
			...(orderType && { orderType: orderType as any })
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
		return json({ error: 'Erro ao buscar pedidos' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Usuário não autenticado' }, { status: 401 });
		}

		const data = await request.json();
		console.log('Received order data:', JSON.stringify(data, null, 2));
		
		// Ensure data types are correct before validation
		if (data.items) {
			data.items = data.items.map((item: any) => ({
				...item,
				productId: parseInt(item.productId),
				quantity: parseInt(item.quantity),
				unitPrice: parseFloat(item.unitPrice),
				discountValue: item.discountValue ? parseFloat(item.discountValue) : undefined
			}));
		}
		
		if (data.payments) {
			data.payments = data.payments.map((payment: any) => ({
				...payment,
				paymentMethodId: parseInt(payment.paymentMethodId),
				amount: parseFloat(payment.amount)
			}));
		}
		
		if (data.customerId) {
			data.customerId = parseInt(data.customerId);
		}
		
		if (data.discountValue) {
			data.discountValue = parseFloat(data.discountValue);
		}
		
		// Log each item's unitPrice type after conversion
		if (data.items) {
			data.items.forEach((item: any, index: number) => {
				console.log(`Item ${index} after conversion - unitPrice:`, item.unitPrice, 'Type:', typeof item.unitPrice);
			});
		}
		
		const validatedData = OrderSchema.parse(data);

		// Generate order number
		const orderCount = await prisma.order.count();
		const orderNumber = `ORD-${String(orderCount + 1).padStart(6, '0')}`;

		// Calculate amounts with discount logic
		let subtotalAmount = 0;
		let processedItems = [...validatedData.items];
		
		// If there's an order-level discount, distribute it across items
		if (validatedData.discountType && validatedData.discountValue) {
			const itemDiscounts = distributeOrderDiscount(
				validatedData.items,
				validatedData.discountType,
				validatedData.discountValue
			);
			
			processedItems = validatedData.items.map((item, index) => ({
				...item,
				discountType: itemDiscounts[index].discountType,
				discountValue: (item.discountValue || 0) + itemDiscounts[index].discountValue
			}));
		}
		
		// Calculate subtotal and total amounts
		for (const item of processedItems) {
			subtotalAmount += item.unitPrice * item.quantity;
		}
		
		let totalAmount = subtotalAmount;
		
		// Apply order-level discount to total
		if (validatedData.discountType && validatedData.discountValue) {
			totalAmount = applyDiscount(subtotalAmount, validatedData.discountType, validatedData.discountValue);
		}
		
		// Validate products and stock
		for (const item of processedItems) {
			const product = await prisma.product.findUnique({
				where: { id: item.productId }
			});

			if (!product || !product.active) {
				return json(
					{ error: `Produto ID ${item.productId} não encontrado ou inativo` },
					{ status: 400 }
				);
			}

			if (product.stockQuantity < item.quantity) {
				return json(
					{ error: `Estoque insuficiente para ${product.name}` },
					{ status: 400 }
				);
			}

			// Verify product is available for the item type
			if (item.itemType === 'RENTAL' && !product.availableForRental) {
				return json(
					{ error: `${product.name} não está disponível para aluguel` },
					{ status: 400 }
				);
			}

			if (item.itemType === 'SALE' && !product.availableForSale) {
				return json(
					{ error: `${product.name} não está disponível para venda` },
					{ status: 400 }
				);
			}
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
		const allItemsAreSale = processedItems.every(item => item.itemType === 'SALE');
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
					orderType: validatedData.orderType,
					subtotalAmount,
					discountType: validatedData.discountType || null,
					discountValue: validatedData.discountValue || null,
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
				const itemTotalPrice = applyDiscount(
					item.unitPrice * item.quantity,
					item.discountType || 'FIXED',
					item.discountValue || 0
				);
				
				await tx.orderItem.create({
					data: {
						orderId: newOrder.id,
						productId: item.productId,
						quantity: item.quantity,
						unitPrice: item.unitPrice,
						discountType: item.discountType || null,
						discountValue: item.discountValue || null,
						totalPrice: itemTotalPrice,
						itemType: item.itemType,
						itemTaken: item.itemTaken || false,
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
						operationType: validatedData.orderType === 'RENTAL' ? 'RENTAL' : 'SALE',
						reason: `${validatedData.orderType === 'RENTAL' ? 'Aluguel' : 'Venda'} - Pedido ${orderNumber}`,
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
			orderItems: createdOrder!.orderItems.map(item => ({
				...item,
				unitPrice: Number(item.unitPrice),
				totalPrice: Number(item.totalPrice),
				discountValue: item.discountValue ? Number(item.discountValue) : null,
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