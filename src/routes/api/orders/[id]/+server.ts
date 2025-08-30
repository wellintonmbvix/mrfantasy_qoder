import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/database.js';
import { z } from 'zod';

const OrderUpdateSchema = z.object({
	status: z.enum(['PENDING', 'CONFIRMED', 'DELIVERED', 'RETURNED', 'CANCELLED']).optional(),
	rentalStartDate: z.string().transform((str) => new Date(str)).optional(),
	rentalEndDate: z.string().transform((str) => new Date(str)).optional(),
	returnDate: z.string().transform((str) => new Date(str)).optional(),
	notes: z.string().optional()
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
				orderItems: {
					include: {
						product: {
							include: {
								group: true
							}
						}
					}
				}
			}
		});

		if (!order) {
			return json({ error: 'Pedido não encontrado' }, { status: 404 });
		}

		return json(order);
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

		// Handle status changes that affect inventory
		if (validatedData.status && validatedData.status !== currentOrder.status) {
			if (validatedData.status === 'CANCELLED' && currentOrder.status !== 'CANCELLED') {
				// Return items to stock
				await prisma.$transaction(async (tx) => {
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
				await prisma.$transaction(async (tx) => {
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

		const order = await prisma.order.update({
			where: { id: orderId },
			data: validatedData,
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
				}
			}
		});

		return json(order);
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