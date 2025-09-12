import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/database.js';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const orderId = parseInt(params.id);
		
		if (isNaN(orderId)) {
			return json({ error: 'ID do pedido inválido' }, { status: 400 });
		}

		// Buscar dados do pedido com todas as relações necessárias
		const order = await prisma.order.findUnique({
			where: { id: orderId },
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

		// Buscar dados da empresa
		const company = await (prisma as any).company.findFirst();

		if (!company) {
			return json({ error: 'Dados da empresa não encontrados' }, { status: 404 });
		}

		// Calcular totais
		const totalItems = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
		
		// Preparar lista de formas de pagamento
		const paymentMethods = order.orderPayments.map(payment => payment.paymentMethod.name);

		const receiptData = {
			company: {
				nomeFantasia: company.nomeFantasia,
				telefone1: company.telefone1,
				telefone2: company.telefone2,
				endereco: company.endereco,
				numero: company.numero,
				complemento: company.complemento,
				bairro: company.bairro,
				cidade: company.cidade,
				estado: company.estado,
				observacaoAluguel: company.observacaoAluguel
			},
			order: {
				orderNumber: order.orderNumber,
				orderDate: order.orderDate,
				rentalStartDate: order.rentalStartDate,
				rentalEndDate: order.rentalEndDate,
				subtotalAmount: order.subtotalAmount,
				totalAmount: order.totalAmount,
				notes: order.notes,
				status: order.status
			},
			customer: order.customer ? {
				name: order.customer.name,
				address: order.customer.address,
				number: order.customer.number,
				neighborhood: order.customer.neighborhood,
				city: order.customer.city,
				state: order.customer.state,
				phone: order.customer.phone,
				phone2: order.customer.phone2,
				documentNumber: order.customer.documentNumber
			} : null,
			attendant: order.attendant ? {
				name: order.attendant.name,
				abbreviation: order.attendant.abbreviation
			} : null,
			items: order.orderItems.map(item => ({
				productName: item.product.name,
				productType: item.product.group?.name || 'Sem categoria',
				quantity: item.quantity,
				unitPrice: item.unitPrice,
				discountValue: item.discountValue || 0,
				totalPrice: item.totalPrice,
				itemType: item.itemType
			})),
			totals: {
				totalItems,
				subtotalAmount: order.subtotalAmount,
				totalAmount: order.totalAmount
			},
			paymentMethods
		};

		return json({ success: true, data: receiptData });
	} catch (error) {
		console.error('Erro ao buscar dados do comprovante:', error);
		return json({ error: 'Erro interno do servidor' }, { status: 500 });
	}
};