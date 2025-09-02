import { z } from 'zod';

// Customer validation schemas
export const customerSchema = z.object({
	name: z.string()
		.min(2, 'Nome deve ter pelo menos 2 caracteres')
		.max(100, 'Nome deve ter no máximo 100 caracteres')
		.trim(),
	email: z.string()
		.email('Email inválido')
		.max(255, 'Email deve ter no máximo 255 caracteres'),
	phone: z.string()
		.min(10, 'Telefone deve ter pelo menos 10 dígitos')
		.regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Formato de telefone inválido'),
	phone2: z.string()
		.regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Formato de telefone inválido')
		.optional()
		.or(z.literal('')),
	address: z.string()
		.min(10, 'Endereço deve ter pelo menos 10 caracteres')
		.max(500, 'Endereço deve ter no máximo 500 caracteres')
		.trim(),
	number: z.string()
		.min(1, 'Número é obrigatório')
		.max(20, 'Número deve ter no máximo 20 caracteres')
		.trim(),
	complement: z.string()
		.max(100, 'Complemento deve ter no máximo 100 caracteres')
		.trim()
		.optional()
		.or(z.literal('')),
	neighborhood: z.string()
		.min(2, 'Bairro deve ter pelo menos 2 caracteres')
		.max(100, 'Bairro deve ter no máximo 100 caracteres')
		.trim(),
	city: z.string()
		.min(2, 'Cidade deve ter pelo menos 2 caracteres')
		.max(100, 'Cidade deve ter no máximo 100 caracteres')
		.trim(),
	state: z.string()
		.length(2, 'Estado deve ter 2 caracteres (UF)')
		.regex(/^[A-Z]{2}$/, 'Estado deve estar em formato UF (ex: SP)')
		.trim(),
	zipCode: z.string()
		.regex(/^\d{5}-?\d{3}$/, 'CEP inválido (formato: 00000-000)')
		.transform(val => val.replace('-', '')),
	documentNumber: z.string()
		.regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido')
});

// Product validation schemas
export const productSchema = z.object({
	name: z.string()
		.min(2, 'Nome deve ter pelo menos 2 caracteres')
		.max(100, 'Nome deve ter no máximo 100 caracteres')
		.trim(),
	description: z.string()
		.min(10, 'Descrição deve ter pelo menos 10 caracteres')
		.max(1000, 'Descrição deve ter no máximo 1000 caracteres')
		.trim()
		.optional(),
	sku: z.string()
		.min(3, 'SKU deve ter pelo menos 3 caracteres')
		.max(50, 'SKU deve ter no máximo 50 caracteres')
		.regex(/^[A-Z0-9-]+$/, 'SKU deve conter apenas letras maiúsculas, números e hífens'),
	costPrice: z.number()
		.min(0, 'Preço de custo deve ser positivo')
		.max(99999.99, 'Preço muito alto'),
	rentalPrice: z.number()
		.min(0, 'Preço de aluguel deve ser positivo')
		.max(99999.99, 'Preço muito alto'),
	salePrice: z.number()
		.min(0, 'Preço de venda deve ser positivo')
		.max(99999.99, 'Preço muito alto')
		.optional()
		.nullable(),
	stockQuantity: z.number()
		.int('Quantidade deve ser um número inteiro')
		.min(0, 'Quantidade deve ser positiva'),
	size: z.string()
		.max(10, 'Tamanho deve ter no máximo 10 caracteres')
		.optional(),
	color: z.string()
		.max(50, 'Cor deve ter no máximo 50 caracteres')
		.optional(),
	groupId: z.number()
		.int('ID do grupo inválido')
		.positive('ID do grupo deve ser positivo'),
	availableForRental: z.boolean(),
	availableForSale: z.boolean()
});

// Product Group validation schemas
export const productGroupSchema = z.object({
	name: z.string()
		.min(2, 'Nome deve ter pelo menos 2 caracteres')
		.max(100, 'Nome deve ter no máximo 100 caracteres')
		.trim(),
	description: z.string()
		.max(500, 'Descrição deve ter no máximo 500 caracteres')
		.trim()
		.optional()
});

// User validation schemas
export const userSchema = z.object({
	username: z.string()
		.min(3, 'Nome de usuário deve ter pelo menos 3 caracteres')
		.max(50, 'Nome de usuário deve ter no máximo 50 caracteres')
		.regex(/^[a-zA-Z0-9_]+$/, 'Nome de usuário deve conter apenas letras, números e underscore')
		.trim(),
	email: z.string()
		.email('Email inválido')
		.max(255, 'Email deve ter no máximo 255 caracteres'),
	password: z.string()
		.min(6, 'Senha deve ter pelo menos 6 caracteres')
		.max(100, 'Senha deve ter no máximo 100 caracteres'),
	role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE'], {
		errorMap: () => ({ message: 'Papel inválido' })
	}),
	active: z.boolean().optional()
});

export const updateUserSchema = userSchema.partial().extend({
	id: z.number().int().positive().optional()
});

// Order validation schemas
export const orderItemSchema = z.object({
	productId: z.number()
		.int('ID do produto inválido')
		.positive('ID do produto deve ser positivo'),
	quantity: z.number()
		.int('Quantidade deve ser um número inteiro')
		.min(1, 'Quantidade deve ser pelo menos 1')
		.max(1000, 'Quantidade muito alta'),
	unitPrice: z.number()
		.min(0, 'Preço unitário deve ser positivo')
		.max(99999.99, 'Preço muito alto'),
	discountType: z.enum(['PERCENTAGE', 'FIXED'], {
		errorMap: () => ({ message: 'Tipo de desconto inválido' })
	}).optional(),
	discountValue: z.number()
		.min(0, 'Valor do desconto deve ser positivo')
		.max(100, 'Desconto percentual não pode ser maior que 100%')
		.optional(),
	subtotal: z.number()
		.min(0, 'Subtotal deve ser positivo')
		.max(999999.99, 'Subtotal muito alto')
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

export const orderSchema = z.object({
	customerId: z.number()
		.int('ID do cliente inválido')
		.positive('ID do cliente deve ser positivo'),
	type: z.enum(['RENTAL', 'SALE'], {
		errorMap: () => ({ message: 'Tipo de pedido inválido' })
	}),
	orderDate: z.string()
		.refine(date => !isNaN(Date.parse(date)), 'Data inválida'),
	returnDate: z.string()
		.refine(date => !isNaN(Date.parse(date)), 'Data de retorno inválida')
		.optional()
		.nullable(),
	subtotalAmount: z.number()
		.min(0, 'Subtotal deve ser positivo')
		.max(999999.99, 'Subtotal muito alto'),
	discountType: z.enum(['PERCENTAGE', 'FIXED'], {
		errorMap: () => ({ message: 'Tipo de desconto inválido' })
	}).optional(),
	discountValue: z.number()
		.min(0, 'Valor do desconto deve ser positivo')
		.optional(),
	totalAmount: z.number()
		.min(0, 'Valor total deve ser positivo')
		.max(999999.99, 'Valor total muito alto'),
	status: z.enum(['PENDING', 'CONFIRMED', 'DELIVERED', 'RETURNED', 'CANCELLED'], {
		errorMap: () => ({ message: 'Status inválido' })
	}).optional(),
	items: z.array(orderItemSchema)
		.min(1, 'Pedido deve ter pelo menos um item')
		.max(50, 'Pedido pode ter no máximo 50 itens')
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

// Authentication validation schemas
export const loginSchema = z.object({
	email: z.string()
		.email('Email inválido')
		.max(255, 'Email deve ter no máximo 255 caracteres'),
	password: z.string()
		.min(1, 'Senha é obrigatória')
});

// Company validation schemas
export const companySchema = z.object({
	razaoSocial: z.string()
		.min(2, 'Razão social deve ter pelo menos 2 caracteres')
		.max(200, 'Razão social deve ter no máximo 200 caracteres')
		.trim(),
	nomeFantasia: z.string()
		.min(2, 'Nome fantasia deve ter pelo menos 2 caracteres')
		.max(200, 'Nome fantasia deve ter no máximo 200 caracteres')
		.trim(),
	endereco: z.string()
		.min(5, 'Endereço deve ter pelo menos 5 caracteres')
		.max(300, 'Endereço deve ter no máximo 300 caracteres')
		.trim(),
	numero: z.string()
		.min(1, 'Número é obrigatório')
		.max(20, 'Número deve ter no máximo 20 caracteres')
		.trim(),
	complemento: z.string()
		.max(100, 'Complemento deve ter no máximo 100 caracteres')
		.trim()
		.optional(),
	bairro: z.string()
		.min(2, 'Bairro deve ter pelo menos 2 caracteres')
		.max(100, 'Bairro deve ter no máximo 100 caracteres')
		.trim(),
	cidade: z.string()
		.min(2, 'Cidade deve ter pelo menos 2 caracteres')
		.max(100, 'Cidade deve ter no máximo 100 caracteres')
		.trim(),
	estado: z.string()
		.length(2, 'Estado deve ter 2 caracteres (UF)')
		.regex(/^[A-Z]{2}$/, 'Estado deve estar em formato UF (ex: SP)')
		.trim(),
	cep: z.string()
		.regex(/^\d{5}-?\d{3}$/, 'CEP inválido (formato: 00000-000)')
		.transform(val => val.replace('-', '')),
	telefone1: z.string()
		.min(10, 'Telefone deve ter pelo menos 10 dígitos')
		.regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, 'Formato de telefone inválido')
		.transform(val => val.replace(/\D/g, '')),
	telefone2: z.string()
		.regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, 'Formato de telefone inválido')
		.transform(val => val.replace(/\D/g, ''))
		.optional()
		.or(z.literal('')),
	cnpj: z.string()
		.regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, 'CNPJ inválido')
		.refine(isValidCNPJ, 'CNPJ inválido')
		.transform(val => val.replace(/\D/g, '')),
	inscricaoEstadual: z.string()
		.max(50, 'Inscrição estadual deve ter no máximo 50 caracteres')
		.trim()
		.optional()
		.or(z.literal('')),
	observacaoAluguel: z.string()
		.max(1000, 'Observação deve ter no máximo 1000 caracteres')
		.trim()
		.optional()
		.or(z.literal(''))
});

// Settings validation schemas
export const settingsSchema = z.object({
	databaseVersion: z.number()
		.int('Versão do banco de dados deve ser um número inteiro')
		.min(1, 'Versão do banco de dados deve ser pelo menos 1')
		.max(999999, 'Versão do banco de dados muito alta'),
	receiptInBobina: z.boolean(),
	inhibitSurcharge: z.boolean()
});

// Phone number formatting utility
export function formatPhone(value: string): string {
	const cleaned = value.replace(/\D/g, '');
	if (cleaned.length <= 11) {
		return cleaned.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
	}
	return value;
}

// CPF formatting utility
export function formatCPF(value: string): string {
	const cleaned = value.replace(/\D/g, '');
	if (cleaned.length <= 11) {
		return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
	}
	return value;
}

// CNPJ formatting utility
export function formatCNPJ(value: string): string {
	const cleaned = value.replace(/\D/g, '');
	if (cleaned.length <= 14) {
		return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
	}
	return value;
}

// CEP formatting utility
export function formatCEP(value: string): string {
	const cleaned = value.replace(/\D/g, '');
	if (cleaned.length <= 8) {
		return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
	}
	return value;
}

// CPF validation utility
export function isValidCPF(cpf: string): boolean {
	const cleaned = cpf.replace(/\D/g, '');
	
	if (cleaned.length !== 11) return false;
	if (/^(\d)\1{10}$/.test(cleaned)) return false; // All same digits
	
	// Calculate first verification digit
	let sum = 0;
	for (let i = 0; i < 9; i++) {
		sum += parseInt(cleaned[i]) * (10 - i);
	}
	let remainder = sum % 11;
	let digit1 = remainder < 2 ? 0 : 11 - remainder;
	
	if (parseInt(cleaned[9]) !== digit1) return false;
	
	// Calculate second verification digit
	sum = 0;
	for (let i = 0; i < 10; i++) {
		sum += parseInt(cleaned[i]) * (11 - i);
	}
	remainder = sum % 11;
	let digit2 = remainder < 2 ? 0 : 11 - remainder;
	
	return parseInt(cleaned[10]) === digit2;
}

// CNPJ validation utility
export function isValidCNPJ(cnpj: string): boolean {
	const cleaned = cnpj.replace(/\D/g, '');
	
	if (cleaned.length !== 14) return false;
	if (/^(\d)\1{13}$/.test(cleaned)) return false; // All same digits
	
	// Calculate first verification digit
	let sum = 0;
	const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
	for (let i = 0; i < 12; i++) {
		sum += parseInt(cleaned[i]) * weights1[i];
	}
	let remainder = sum % 11;
	let digit1 = remainder < 2 ? 0 : 11 - remainder;
	
	if (parseInt(cleaned[12]) !== digit1) return false;
	
	// Calculate second verification digit
	sum = 0;
	const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
	for (let i = 0; i < 13; i++) {
		sum += parseInt(cleaned[i]) * weights2[i];
	}
	remainder = sum % 11;
	let digit2 = remainder < 2 ? 0 : 11 - remainder;
	
	return parseInt(cleaned[13]) === digit2;
}

// Form validation utility
export function validateForm<T>(schema: z.ZodSchema<T>, data: any): {
	success: boolean;
	data?: T;
	errors?: Record<string, string>;
} {
	try {
		const result = schema.parse(data);
		return { success: true, data: result };
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errors: Record<string, string> = {};
			error.errors.forEach(err => {
				const path = err.path.join('.');
				errors[path] = err.message;
			});
			return { success: false, errors };
		}
		return { success: false, errors: { general: 'Erro de validação' } };
	}
}

// Date validation utilities
export function isValidDate(dateString: string): boolean {
	const date = new Date(dateString);
	return !isNaN(date.getTime());
}

export function isFutureDate(dateString: string): boolean {
	const date = new Date(dateString);
	const now = new Date();
	return date > now;
}

export function isValidDateRange(startDate: string, endDate: string): boolean {
	const start = new Date(startDate);
	const end = new Date(endDate);
	return start < end;
}

// Price formatting utility
export function formatPrice(value: number): string {
	return new Intl.NumberFormat('pt-BR', {
		style: 'currency',
		currency: 'BRL'
	}).format(value);
}

// Number input validation
export function parseNumber(value: string): number | null {
	const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
	const number = parseFloat(cleaned);
	return isNaN(number) ? null : number;
}

// Discount calculation utilities
export function calculateDiscount(amount: number, discountType: 'PERCENTAGE' | 'FIXED', discountValue: number): number {
	if (discountType === 'PERCENTAGE') {
		return (amount * discountValue) / 100;
	}
	return Math.min(discountValue, amount); // Fixed discount can't be more than the amount
}

export function applyDiscount(amount: number, discountType: 'PERCENTAGE' | 'FIXED', discountValue: number): number {
	const discountAmount = calculateDiscount(amount, discountType, discountValue);
	return Math.max(0, amount - discountAmount);
}

// Function to distribute order-level discount across items proportionally
export function distributeOrderDiscount(
	items: Array<{ unitPrice: number; quantity: number }>,
	orderDiscountType: 'PERCENTAGE' | 'FIXED',
	orderDiscountValue: number
): Array<{ discountType: 'PERCENTAGE' | 'FIXED'; discountValue: number }> {
	const totalAmount = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
	
	if (totalAmount === 0) {
		return items.map(() => ({ discountType: 'FIXED', discountValue: 0 }));
	}
	
	if (orderDiscountType === 'PERCENTAGE') {
		// For percentage discounts, apply same percentage to all items
		return items.map(() => ({ 
			discountType: 'PERCENTAGE' as const, 
			discountValue: orderDiscountValue 
		}));
	} else {
		// For fixed discounts, distribute proportionally
		return items.map((item) => {
			const itemTotal = item.unitPrice * item.quantity;
			const proportion = itemTotal / totalAmount;
			const itemDiscount = orderDiscountValue * proportion;
			return { 
				discountType: 'FIXED' as const, 
				discountValue: itemDiscount 
			};
		});
	}
}