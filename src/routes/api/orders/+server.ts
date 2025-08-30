import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/database.js';
import { z } from 'zod';

// Use consistent validation schema
const OrderItemSchema = z.object({
	productId: z.number().int().positive('ID do produto deve ser positivo'),
	quantity: z.number().int().min(1, 'Quantidade deve ser pelo menos 1'),
	unitPrice: z.number().min(0, 'Preço unitário deve ser positivo'),
	itemType: z.enum(['RENTAL', 'SALE'])
});

const OrderPaymentSchema = z.object({
	paymentMethodId: z.number().int().positive('ID do meio de pagamento deve ser positivo'),
	amount: z.number().min(0.01, 'Valor do pagamento deve ser maior que zero'),
	notes: z.string().optional()
});

const OrderSchema = z.object({
	customerId: z.number().int().positive('ID do cliente deve ser positivo'),
	orderType: z.enum(['RENTAL', 'SALE']),
	orderDate: z.string().transform((str) => new Date(str)),
	rentalStartDate: z.string().transform((str) => new Date(str)).optional(),
	rentalEndDate: z.string().transform((str) => new Date(str)).optional(),
	notes: z.string().optional(),
	items: z.array(OrderItemSchema).min(1, 'Pelo menos um item é obrigatório'),
	payments: z.array(OrderPaymentSchema).min(1, 'Pelo menos um meio de pagamento é obrigatório')
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

		return json({
			orders,
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
				unitPrice: parseFloat(item.unitPrice)
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

		// Calculate total amount
		let totalAmount = 0;
		
		// Validate products and stock
		for (const item of validatedData.items) {
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

			// Verify product is available for the order type
			if (validatedData.orderType === 'RENTAL' && !product.availableForRental) {
				return json(
					{ error: `${product.name} não está disponível para aluguel` },
					{ status: 400 }
				);
			}

			if (validatedData.orderType === 'SALE' && !product.availableForSale) {
				return json(
					{ error: `${product.name} não está disponível para venda` },
					{ status: 400 }
				);
			}

			totalAmount += item.unitPrice * item.quantity;
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

		// Create order in a transaction
		const order = await prisma.$transaction(async (tx: any) => {
			// Create the order
			const newOrder = await tx.order.create({
				data: {
					customerId: validatedData.customerId,
					userId: locals.user!.id,
					orderNumber,
					orderType: validatedData.orderType,
					totalAmount,
					orderDate: validatedData.orderDate,
					rentalStartDate: validatedData.rentalStartDate,
					rentalEndDate: validatedData.rentalEndDate,
					notes: validatedData.notes || '',
					status: 'PENDING'
				}
			});

			// Create order items and update stock
			for (const item of validatedData.items) {
				await tx.orderItem.create({
					data: {
						orderId: newOrder.id,
						productId: item.productId,
						quantity: item.quantity,
						unitPrice: item.unitPrice,
						totalPrice: item.unitPrice * item.quantity,
						itemType: item.itemType
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

		return json(createdOrder, { status: 201 });
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