import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/database.js';
import { ProductType } from '@prisma/client';
import { z } from 'zod';
import { createAuditLog } from '$lib/server/auditLog.js'; // Importando serviço de auditoria

const ProductSchema = z.object({
	name: z.string().min(1, 'Nome é obrigatório'),
	description: z.string().optional(),
	sku: z.string().min(1, 'SKU é obrigatório'),
	costPrice: z.number().min(0, 'Preço de custo deve ser maior que 0'),
	rentalPrice: z.number().min(0, 'Preço de aluguel deve ser maior que 0'),
	salePrice: z.number().min(0, 'Preço de venda deve ser maior que 0'),
	stockQuantity: z.number().int().min(0, 'Quantidade deve ser maior ou igual a 0'),
	size: z.string().optional(),
	color: z.string().optional(),
	productType: z.enum(['FANTASY', 'ACCESSORY']),
	groupId: z.number().int().min(1, 'Grupo é obrigatório'),
	imageUrl: z.string().optional(),
	availableForRental: z.boolean().optional(),
	availableForSale: z.boolean().optional()
});

export const GET: RequestHandler = async ({ url }) => {
	try {
		const search = url.searchParams.get('search') || '';
		const groupId = url.searchParams.get('groupId');
		const productType = url.searchParams.get('productType');
		const availableForRental = url.searchParams.get('availableForRental');
		const availableForSale = url.searchParams.get('availableForSale');
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '10');
		const skip = (page - 1) * limit;

		// Validate productType if provided
		const validProductType = productType && Object.values(ProductType).includes(productType as ProductType) 
			? productType as ProductType 
			: undefined;

		const where = {
			active: true,
			...(search && {
				OR: [
					{ name: { contains: search } },
					{ description: { contains: search } },
					{ sku: { contains: search } }
				]
			}),
			...(groupId && { groupId: parseInt(groupId) }),
			...(validProductType && { productType: validProductType }),
			...(availableForRental !== null && { availableForRental: availableForRental === 'true' }),
			...(availableForSale !== null && { availableForSale: availableForSale === 'true' })
		};

		const [products, total] = await Promise.all([
			prisma.product.findMany({
				where,
				include: {
					group: true
				},
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' }
			}),
			prisma.product.count({ where })
		]);

		// Serialize Decimal fields to numbers
		const serializedProducts = products.map(product => ({
			...product,
			costPrice: Number(product.costPrice),
			rentalPrice: Number(product.rentalPrice),
			salePrice: Number(product.salePrice)
		}));

		return json({
			products: serializedProducts,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit)
			}
		});
	} catch (error) {
		return json({ error: 'Erro ao buscar produtos' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const data = await request.json();
		const validatedData = ProductSchema.parse(data);

		// Check if SKU already exists
		const existingProduct = await prisma.product.findUnique({
			where: { sku: validatedData.sku }
		});

		if (existingProduct) {
			return json(
				{ error: 'Produto com este SKU já existe' },
				{ status: 400 }
			);
		}

		// Verify group exists
		const group = await prisma.productGroup.findUnique({
			where: { id: validatedData.groupId }
		});

		if (!group) {
			return json(
				{ error: 'Grupo não encontrado' },
				{ status: 400 }
			);
		}

		const product = await prisma.product.create({
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

		// Registrar log de auditoria para criação
		try {
			if (locals.user) {
				await createAuditLog({
					module: 'products',
					actionType: 'CREATE',
					newData: serializedProduct,
					userId: locals.user.id
				});
			}
		} catch (logError) {
			console.error('Erro ao registrar log de auditoria:', logError);
		}

		return json(serializedProduct, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return json(
				{ error: 'Dados inválidos', details: error.errors },
				{ status: 400 }
			);
		}

		return json({ error: 'Erro ao criar produto' }, { status: 500 });
	}
};