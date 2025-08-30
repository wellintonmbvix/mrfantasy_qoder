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
	address: z.string()
		.min(10, 'Endereço deve ter pelo menos 10 caracteres')
		.max(500, 'Endereço deve ter no máximo 500 caracteres')
		.trim(),
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
	subtotal: z.number()
		.min(0, 'Subtotal deve ser positivo')
		.max(999999.99, 'Subtotal muito alto')
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
	totalAmount: z.number()
		.min(0, 'Valor total deve ser positivo')
		.max(999999.99, 'Valor total muito alto'),
	status: z.enum(['PENDING', 'CONFIRMED', 'DELIVERED', 'RETURNED', 'CANCELLED'], {
		errorMap: () => ({ message: 'Status inválido' })
	}).optional(),
	items: z.array(orderItemSchema)
		.min(1, 'Pedido deve ter pelo menos um item')
		.max(50, 'Pedido pode ter no máximo 50 itens')
});

// Authentication validation schemas
export const loginSchema = z.object({
	email: z.string()
		.email('Email inválido')
		.max(255, 'Email deve ter no máximo 255 caracteres'),
	password: z.string()
		.min(1, 'Senha é obrigatória')
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