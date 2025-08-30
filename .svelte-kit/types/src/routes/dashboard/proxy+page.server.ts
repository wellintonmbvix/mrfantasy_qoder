// @ts-nocheck
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/database.js';

export const load = async () => {
	try {
		// Get basic statistics
		const [totalCustomers, totalProducts, activeOrders, recentOrders, lowStockProducts] = await Promise.all([
			prisma.customer.count({ where: { active: true } }),
			prisma.product.count({ where: { active: true } }),
			prisma.order.count({ 
				where: { 
					status: { in: ['PENDING', 'CONFIRMED', 'DELIVERED'] } 
				} 
			}),
			prisma.order.findMany({
				take: 5,
				orderBy: { createdAt: 'desc' },
				include: {
					customer: {
						select: { name: true }
					}
				}
			}),
			prisma.product.findMany({
				where: {
					active: true,
					stockQuantity: { lte: 5 }
				},
				take: 5,
				orderBy: { stockQuantity: 'asc' }
			})
		]);

		// Calculate monthly revenue
		const startOfMonth = new Date();
		startOfMonth.setDate(1);
		startOfMonth.setHours(0, 0, 0, 0);

		const monthlyOrders = await prisma.order.findMany({
			where: {
				orderDate: { gte: startOfMonth },
				status: { not: 'CANCELLED' }
			},
			select: { totalAmount: true }
		});

		const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);

		return {
			stats: {
				totalCustomers,
				totalProducts,
				activeOrders,
				monthlyRevenue
			},
			recentOrders,
			lowStockProducts
		};
	} catch (error) {
		console.error('Error loading dashboard data:', error);
		return {
			stats: {
				totalCustomers: 0,
				totalProducts: 0,
				activeOrders: 0,
				monthlyRevenue: 0
			},
			recentOrders: [],
			lowStockProducts: []
		};
	}
};;null as any as PageServerLoad;