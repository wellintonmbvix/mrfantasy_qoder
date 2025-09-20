import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/database.js';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		// Verificar autenticação
		if (!locals.user) {
			return json({ error: 'Usuário não autenticado' }, { status: 401 });
		}

		// Validar e processar parâmetros de consulta
		const dateFrom = url.searchParams.get('dateFrom') || undefined;
		const dateTo = url.searchParams.get('dateTo') || undefined;
		const productIdParam = url.searchParams.get('productId');
		const productId = productIdParam && productIdParam.trim() !== '' ? parseInt(productIdParam) : undefined;
		const itemStatus = url.searchParams.get('itemStatus') || 'not_taken';
		const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
		const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));

		// Validar itemStatus
		if (!['not_taken', 'not_returned', 'returned'].includes(itemStatus)) {
			return json(
				{ 
					error: 'Status do item inválido. Use: not_taken, not_returned ou returned'
				}, 
				{ status: 400 }
			);
		}		

		const skip = (page - 1) * limit;

		// Construir filtros para a consulta
		const whereClause: any = {
			itemType: 'RENTAL' // Apenas itens de aluguel
		};

		// Filtros de status do item (obrigatório)
		switch (itemStatus) {
			case 'not_taken':
				whereClause.itemTaken = false;
				break;
			case 'not_returned':
				// Para "Não Devolvidos": item deve estar retirado (taken=true) mas não devolvido (returned=false)
				whereClause.itemTaken = true;
				whereClause.itemReturned = false;
				break;
			case 'returned':
				whereClause.itemReturned = true;
				break;
		}

		// Filtro por produto (opcional)
		if (productId && !isNaN(productId)) {
			whereClause.productId = productId;
		}

		// Filtros de data (opcional)
		const orderFilters: any = {};
		if (dateFrom || dateTo) {
			orderFilters.orderDate = {};
			if (dateFrom) {
				const fromDate = new Date(dateFrom);
				if (!isNaN(fromDate.getTime())) {
					orderFilters.orderDate.gte = fromDate;
				}
			}
			if (dateTo) {
				const toDate = new Date(dateTo);
				if (!isNaN(toDate.getTime())) {
					// Adicionar 23:59:59 para incluir o dia inteiro
					toDate.setHours(23, 59, 59, 999);
					orderFilters.orderDate.lte = toDate;
				}
			}
		}

		if (Object.keys(orderFilters).length > 0) {
			whereClause.order = orderFilters;
		}

		// Executar consulta
		const [rentalItems, total] = await Promise.all([
			prisma.orderItem.findMany({
				where: whereClause,
				include: {
					order: {
						select: {
							id: true,
							orderNumber: true,
							orderDate: true,
							rentalStartDate: true,
							rentalEndDate: true,
							customer: {
								select: {
									id: true,
									name: true
								}
							}
						}
					},
					product: {
						select: {
							id: true,
							name: true,
							sku: true
						}
					}
				},
				orderBy: [
					{ product: { name: 'asc' } },
					{ order: { orderDate: 'desc' } }
				],
				skip,
				take: limit
			}),
			prisma.orderItem.count({ where: whereClause })
		]);

		// Serializar dados e agrupar por produto
		const groupedData = new Map();

		rentalItems.forEach(item => {
			const productId = item.product.id;
			
			if (!groupedData.has(productId)) {
				groupedData.set(productId, {
					product: item.product,
					items: []
				});
			}

			groupedData.get(productId).items.push({
				id: item.id,
				quantity: item.quantity,
				unitPrice: Number(item.unitPrice),
				totalPrice: Number(item.totalPrice),
				itemTaken: item.itemTaken,
				itemReturned: item.itemReturned,
				order: {
					...item.order,
					orderDate: item.order.orderDate,
					rentalStartDate: item.order.rentalStartDate,
					rentalEndDate: item.order.rentalEndDate
				}
			});
		});

		// Converter Map para array
		const reportData = Array.from(groupedData.values());

		// Calcular metadados de paginação
		const totalPages = Math.ceil(total / limit);

		return json({
			success: true,
			data: reportData,
			pagination: {
				page,
				limit,
				total,
				totalPages,
				hasNext: page < totalPages,
				hasPrev: page > 1
			},
			filters: {
				dateFrom,
				dateTo,
				productId,
				itemStatus
			}
		});

	} catch (error) {
		console.error('Erro ao gerar relatório de itens de aluguel:', error);
		return json(
			{ 
				error: 'Erro interno do servidor',
				details: process.env.NODE_ENV === 'development' ? error : undefined
			}, 
			{ status: 500 }
		);
	}
};