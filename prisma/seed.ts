import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Seeding database...');

	// Create admin user
	const adminPassword = await bcrypt.hash('admin123', 12);
	
	const adminUser = await prisma.user.upsert({
		where: { email: 'admin@mrfantasy.com' },
		update: {},
		create: {
			username: 'admin',
			email: 'admin@mrfantasy.com',
			passwordHash: adminPassword,
			role: 'ADMIN'
		}
	});

	console.log('✅ Admin user created:', { id: adminUser.id, email: adminUser.email });

	// Create sample product groups
	const fantasyGroup = await prisma.productGroup.upsert({
		where: { id: 1 },
		update: {},
		create: {
			name: 'Super-heróis',
			description: 'Fantasias de super-heróis famosos',
			category: 'FANTASY'
		}
	});

	const accessoryGroup = await prisma.productGroup.upsert({
		where: { id: 2 },
		update: {},
		create: {
			name: 'Acessórios',
			description: 'Acessórios diversos para fantasias',
			category: 'ACCESSORY'
		}
	});

	console.log('✅ Sample groups created');

	// Create sample products
	const sampleProducts = [
		{
			name: 'Fantasia Batman',
			description: 'Fantasia completa do Batman com capa e máscara',
			sku: 'BATMAN-001',
			costPrice: 30.00,
			rentalPrice: 50.00,
			salePrice: 150.00,
			stockQuantity: 5,
			size: 'M',
			color: 'Preto',
			productType: 'FANTASY' as const,
			groupId: fantasyGroup.id,
			availableForRental: true,
			availableForSale: true
		},
		{
			name: 'Máscara Super-herói',
			description: 'Máscara genérica de super-herói',
			sku: 'MASK-001',
			costPrice: 8.00,
			rentalPrice: 10.00,
			salePrice: 25.00,
			stockQuantity: 20,
			productType: 'ACCESSORY' as const,
			groupId: accessoryGroup.id,
			availableForRental: true,
			availableForSale: true
		}
	];

	for (const product of sampleProducts) {
		await prisma.product.upsert({
			where: { sku: product.sku },
			update: {},
			create: product
		});
	}

	console.log('✅ Sample products created');

	// Create sample customer
	const sampleCustomer = await prisma.customer.upsert({
		where: { email: 'cliente@exemplo.com' },
		update: {},
		create: {
			name: 'João Silva',
			email: 'cliente@exemplo.com',
			phone: '(11) 99999-9999',
			phone2: '(11) 88888-8888',
			address: 'Rua das Flores',
			number: '123',
			complement: 'Apto 45',
			neighborhood: 'Centro',
			city: 'São Paulo',
			state: 'SP',
			zipCode: '01234567',
			documentNumber: '123.456.789-10'
		}
	});

	console.log('✅ Sample customer created');

	// Create default payment methods
	const paymentMethods = [
		{ name: 'Dinheiro', description: 'Pagamento em espécie' },
		{ name: 'PIX', description: 'Pagamento via PIX' },
		{ name: 'Cartão de Crédito', description: 'Pagamento via cartão de crédito' },
		{ name: 'Cartão de Débito', description: 'Pagamento via cartão de débito' },
		{ name: 'Cheque', description: 'Pagamento via cheque' }
	];

	for (const method of paymentMethods) {
		await prisma.paymentMethod.upsert({
			where: { name: method.name },
			update: {},
			create: method
		});
	}

	console.log('✅ Default payment methods created');

	console.log('🎉 Database seeded successfully!');
	console.log('📧 Admin login: admin@mrfantasy.com');
	console.log('🔑 Admin password: admin123');
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});