import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/database.js';
import { z } from 'zod';
import { createAuditLog } from '$lib/server/auditLog.js'; // Importando serviço de auditoria

const ProductUpdateSchema = z.object({
	name: z.string().min(1, 'Nome é obrigatório').optional(),
	description: z.string().optional(),
	sku: z.string().min(1, 'SKU é obrigatório').optional(),
	costPrice: z.number().min(0, 'Preço de custo deve ser maior que 0').optional(),
	rentalPrice: z.number().min(0, 'Preço de aluguel deve ser maior que 0').optional(),
	salePrice: z.number().min(0, 'Preço de venda deve ser maior que 0').optional(),
	stockQuantity: z.number().int().min(0, 'Quantidade deve ser maior ou igual a 0').optional(),
	size: z.string().optional(),
	color: z.string().optional(),
	productType: z.enum(['FANTASY', 'ACCESSORY']).optional(),
	groupId: z.number().int().min(1, 'Grupo é obrigatório').optional(),
	imageUrl: z.string().optional(),
	availableForRental: z.boolean().optional(),
	availableForSale: z.boolean().optional()
});

export const GET: RequestHandler = async ({ params }) => {
	try {
		const product = await prisma.product.findUnique({
			where: { id: parseInt(params.id) },
			include: {
				group: true,
				orderItems: {
					include: {
						order: {
							select: {
								id: true,
								orderNumber: true,
								status: true,
								orderDate: true,
								rentalStartDate: true,
								rentalEndDate: true
							}
						}
					},
					orderBy: { createdAt: 'desc' },
					take: 10
				}
			}
		});

		if (!product) {
			return json({ error: 'Produto não encontrado' }, { status: 404 });
		}

		// Serialize Decimal fields to numbers
		const serializedProduct = {
			...product,
			costPrice: Number(product.costPrice),
			rentalPrice: Number(product.rentalPrice),
			salePrice: Number(product.salePrice),
			orderItems: product.orderItems.map(item => ({
				...item,
				unitPrice: Number(item.unitPrice),
				totalPrice: Number(item.totalPrice),
				discountValue: item.discountValue ? Number(item.discountValue) : null
			}))
		};

		return json(serializedProduct);
	} catch (error) {
		return json({ error: 'Erro ao buscar produto' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		// Obter dados originais antes da atualização para o log
		const originalProduct = await prisma.product.findUnique({
			where: { id: parseInt(params.id) },
			include: {
				group: true
			}
		});

		const data = await request.json();
		const validatedData = ProductUpdateSchema.parse(data);

		// Check if SKU already exists for another product
		if (validatedData.sku) {
			const existingProduct = await prisma.product.findFirst({
				where: {
					AND: [
						{ id: { not: parseInt(params.id) } },
						{ sku: validatedData.sku }
					]
				}
			});

			if (existingProduct) {
				return json(
					{ error: 'Produto com este SKU já existe' },
					{ status: 400 }
				);
			}
		}

		// Verify group exists if groupId is being updated
		if (validatedData.groupId) {
			const group = await prisma.productGroup.findUnique({
				where: { id: validatedData.groupId }
			});

			if (!group) {
				return json(
					{ error: 'Grupo não encontrado' },
					{ status: 400 }
				);
			}
		}

		const product = await prisma.product.update({
			where: { id: parseInt(params.id) },
			data: validatedData,
			include: {
				group: true
			}
		});

		// Serialize Decimal fields to numbers
		const serializedProduct = {
			...product,
			costPrice: Number(product.costPrice),
			rentalPrice: Number(product.rentalPrice),
			salePrice: Number(product.salePrice)
		};

		// Registrar log de auditoria para atualização
		try {
			if (locals.user && originalProduct) {
				// Serializar o produto original também
				const serializedOriginalProduct = {
					...originalProduct,
					costPrice: Number(originalProduct.costPrice),
					rentalPrice: Number(originalProduct.rentalPrice),
					salePrice: Number(originalProduct.salePrice)
				};

				await createAuditLog({
					module: 'products',
					actionType: 'UPDATE',
					originalData: serializedOriginalProduct,
					newData: serializedProduct,
					userId: locals.user.id
				});
			}
		} catch (logError) {
			console.error('Erro ao registrar log de auditoria:', logError);
		}

		return json(serializedProduct);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return json(
				{ error: 'Dados inválidos', details: error.errors },
				{ status: 400 }
			);
		}

		return json({ error: 'Erro ao atualizar produto' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		// Obter dados originais antes da exclusão para o log
		const originalProduct = await prisma.product.findUnique({
			where: { id: parseInt(params.id) },
			include: {
				group: true
			}
		});

		// Check if product has active orders
		const activeOrders = await prisma.orderItem.count({
			where: {
				productId: parseInt(params.id),
				order: {
					status: { in: ['PENDING', 'CONFIRMED', 'DELIVERED'] }
				}
			}
		});

		if (activeOrders > 0) {
			return json(
				{ error: 'Não é possível excluir produto com pedidos ativos' },
				{ status: 400 }
			);
		}

		await prisma.product.update({
			where: { id: parseInt(params.id) },
			data: { active: false }
		});

		// Registrar log de auditoria para exclusão
		try {
			if (locals.user && originalProduct) {
				// Serializar o produto original também
				const serializedOriginalProduct = {
					...originalProduct,
					costPrice: Number(originalProduct.costPrice),
					rentalPrice: Number(originalProduct.rentalPrice),
					salePrice: Number(originalProduct.salePrice)
				};

				await createAuditLog({
					module: 'products',
					actionType: 'DELETE',
					originalData: serializedOriginalProduct,
					userId: locals.user.id
				});
			}
		} catch (logError) {
			console.error('Erro ao registrar log de auditoria:', logError);
		}

		return json({ success: true });
	} catch (error) {
		return json({ error: 'Erro ao excluir produto' }, { status: 500 });
	}
};