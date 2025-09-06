import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/database.js';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware.js';

const OrderUpdateSchema = z.object({
	status: z.enum(['PENDING', 'CONFIRMED', 'DELIVERED', 'RETURNED', 'CANCELLED']).optional(),
	attendantId: z.number().int().positive('ID do atendente deve ser positivo').optional(),
	rentalStartDate: z.string().transform((str) => new Date(str)).optional(),
	rentalEndDate: z.string().transform((str) => new Date(str)).optional(),
	returnDate: z.string().transform((str) => new Date(str)).optional(),
	notes: z.string().optional(),
	orderItems: z.array(z.object({
		id: z.number().int().positive(),
		itemTaken: z.boolean().optional(),
		itemReturned: z.boolean().optional()
	})).optional()
});

export const GET: RequestHandler = async ({ params }) => {
	try {
		const order = await prisma.order.findUnique({
			where: { id: parseInt(params.id) },
			include: {
				customer: true,
				user: {
					select: {
						id: true,
						username: true,
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
							include: {
								group: true
							}
						}
					}
				},
				orderPayments: {
					include: {
						paymentMethod: true
					}
				}
			}
		});

		if (!order) {
			return json({ error: 'Pedido não encontrado' }, { status: 404 });
		}

		// Serialize Decimal fields to numbers
		const serializedOrder = {
			...order,
			subtotalAmount: Number(order.subtotalAmount),
			totalAmount: Number(order.totalAmount),
			discountValue: order.discountValue ? Number(order.discountValue) : null,
			orderItems: order.orderItems.map(item => ({
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
			orderPayments: order.orderPayments.map(payment => ({
				...payment,
				amount: Number(payment.amount)
			}))
		};

		return json(serializedOrder);
	} catch (error) {
		return json({ error: 'Erro ao buscar pedido' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Usuário não autenticado' }, { status: 401 });
		}

		const data = await request.json();
		const validatedData = OrderUpdateSchema.parse(data);

		const orderId = parseInt(params.id);

		// Get current order
		const currentOrder = await prisma.order.findUnique({
			where: { id: orderId },
			include: { orderItems: true }
		});

		if (!currentOrder) {
			return json({ error: 'Pedido não encontrado' }, { status: 404 });
		}

		// Validar permissões para alteração de itemReturned de true para false
		if (validatedData.orderItems) {
			for (const itemUpdate of validatedData.orderItems) {
				// Encontrar o item atual no pedido
				const currentItem = currentOrder.orderItems.find(item => item.id === itemUpdate.id);
				
				if (currentItem && itemUpdate.itemReturned !== undefined) {
					// Se tentando alterar itemReturned de true para false
					if (currentItem.itemReturned === true && itemUpdate.itemReturned === false) {
						// Verificar se o usuário tem papel ADMIN ou MANAGER
						const roleCheck = requireRole(locals, 'MANAGER');
						if (!roleCheck.success) {
							return json(
								{ error: 'Somente usuários com papel administrativo ou gerente podem reverter status de devolução' },
								{ status: 403 }
							);
						}
					}
				}
			}
		}

		// Handle status changes that affect inventory
		if (validatedData.status && validatedData.status !== currentOrder.status) {
			if (validatedData.status === 'CANCELLED' && currentOrder.status !== 'CANCELLED') {
				// Return items to stock
				await prisma.$transaction(async (tx: any) => {
					for (const item of currentOrder.orderItems) {
						await tx.product.update({
							where: { id: item.productId },
							data: {
								stockQuantity: {
									increment: item.quantity
								}
							}
						});

						// Create inventory log
						await tx.inventoryLog.create({
							data: {
								productId: item.productId,
								quantityChange: item.quantity,
								operationType: 'RETURN',
								reason: `Cancelamento do pedido ${currentOrder.orderNumber}`,
								userId: locals.user!.id
							}
						});
					}
				});
			}

			if (validatedData.status === 'RETURNED' && currentOrder.orderType === 'RENTAL') {
				// Return rental items to stock
				await prisma.$transaction(async (tx: any) => {
					for (const item of currentOrder.orderItems) {
						if (item.itemType === 'RENTAL') {
							await tx.product.update({
								where: { id: item.productId },
								data: {
									stockQuantity: {
										increment: item.quantity
									}
								}
							});

							// Create inventory log
							await tx.inventoryLog.create({
								data: {
									productId: item.productId,
									quantityChange: item.quantity,
									operationType: 'RETURN',
									reason: `Devolução do aluguel - Pedido ${currentOrder.orderNumber}`,
									userId: locals.user!.id
								}
							});
						}
					}
				});

				// Set return date if not provided
				if (!validatedData.returnDate) {
					validatedData.returnDate = new Date();
				}
			}
		}

		const order = await prisma.$transaction(async (tx: any) => {
			// Update order
			const updatedOrder = await tx.order.update({
				where: { id: orderId },
				data: {
					status: validatedData.status,
					attendantId: validatedData.attendantId,
					rentalStartDate: validatedData.rentalStartDate,
					rentalEndDate: validatedData.rentalEndDate,
					returnDate: validatedData.returnDate,
					notes: validatedData.notes
				}
			});

			// Update order items if provided
			if (validatedData.orderItems) {
				for (const itemUpdate of validatedData.orderItems) {
					await tx.orderItem.update({
						where: { id: itemUpdate.id },
						data: {
							itemTaken: itemUpdate.itemTaken,
							itemReturned: itemUpdate.itemReturned
						}
					});
				}
			}

			return updatedOrder;
		});

		// Fetch the updated order with all relations
		const orderWithRelations = await prisma.order.findUnique({
			where: { id: orderId },
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
		const serializedOrder = {
			...orderWithRelations,
			subtotalAmount: Number(orderWithRelations!.subtotalAmount),
			totalAmount: Number(orderWithRelations!.totalAmount),
			discountValue: orderWithRelations!.discountValue ? Number(orderWithRelations!.discountValue) : null,
			orderItems: orderWithRelations!.orderItems.map(item => ({
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
			orderPayments: orderWithRelations!.orderPayments.map(payment => ({
				...payment,
				amount: Number(payment.amount)
			}))
		};

		return json(serializedOrder);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return json(
				{ error: 'Dados inválidos', details: error.errors },
				{ status: 400 }
			);
		}

		console.error('Error updating order:', error);
		return json({ error: 'Erro ao atualizar pedido' }, { status: 500 });
	}
};