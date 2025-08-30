import { describe, it, expect } from 'vitest';
import { 
	formatPhone, 
	formatCPF, 
	isValidCPF, 
	validateForm, 
	customerSchema, 
	productSchema,
	userSchema 
} from '$lib/utils/validation';

describe('Validation Utilities', () => {
	describe('formatPhone', () => {
		it('should format valid phone numbers', () => {
			expect(formatPhone('11999999999')).toBe('(11) 99999-9999');
			expect(formatPhone('1199999999')).toBe('(11) 9999-9999');
		});

		it('should handle partial phone numbers', () => {
			expect(formatPhone('11999')).toBe('(11) 999');
			expect(formatPhone('119')).toBe('(11) 9');
		});

		it('should return original value for invalid input', () => {
			expect(formatPhone('abc123')).toBe('abc123');
		});
	});

	describe('formatCPF', () => {
		it('should format valid CPF numbers', () => {
			expect(formatCPF('12345678901')).toBe('123.456.789-01');
		});

		it('should handle partial CPF numbers', () => {
			expect(formatCPF('12345')).toBe('123.45');
			expect(formatCPF('123456789')).toBe('123.456.789');
		});

		it('should return original value for too long input', () => {
			const longInput = '123456789012345';
			expect(formatCPF(longInput)).toBe(longInput);
		});
	});

	describe('isValidCPF', () => {
		it('should validate correct CPF numbers', () => {
			expect(isValidCPF('123.456.789-09')).toBe(true);
			expect(isValidCPF('11144477735')).toBe(true);
		});

		it('should reject invalid CPF numbers', () => {
			expect(isValidCPF('123.456.789-00')).toBe(false);
			expect(isValidCPF('111.111.111-11')).toBe(false);
			expect(isValidCPF('123')).toBe(false);
		});
	});

	describe('validateForm', () => {
		it('should validate correct customer data', () => {
			const validCustomer = {
				name: 'João Silva',
				email: 'joao@email.com',
				phone: '(11) 99999-9999',
				address: 'Rua das Flores, 123, Centro, São Paulo - SP',
				documentNumber: '123.456.789-09'
			};

			const result = validateForm(customerSchema, validCustomer);
			expect(result.success).toBe(true);
			expect(result.data).toEqual(validCustomer);
		});

		it('should return errors for invalid customer data', () => {
			const invalidCustomer = {
				name: '',
				email: 'invalid-email',
				phone: '123',
				address: 'short',
				documentNumber: '123'
			};

			const result = validateForm(customerSchema, invalidCustomer);
			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors!['name']).toContain('pelo menos 2 caracteres');
			expect(result.errors!['email']).toContain('Email inválido');
		});
	});

	describe('productSchema', () => {
		it('should validate correct product data', () => {
			const validProduct = {
				name: 'Fantasia Super-Herói',
				description: 'Fantasia completa de super-herói para festas',
				sku: 'SUPER-001',
				rentalPrice: 25.00,
				salePrice: 150.00,
				stockQuantity: 5,
				size: 'M',
				color: 'Azul',
				groupId: 1,
				availableForRental: true,
				availableForSale: true
			};

			const result = validateForm(productSchema, validProduct);
			expect(result.success).toBe(true);
		});

		it('should reject invalid product data', () => {
			const invalidProduct = {
				name: 'A',
				sku: 'inv@lid',
				rentalPrice: -10,
				stockQuantity: -1,
				groupId: 0
			};

			const result = validateForm(productSchema, invalidProduct);
			expect(result.success).toBe(false);
			expect(result.errors!['name']).toContain('pelo menos 2 caracteres');
			expect(result.errors!['sku']).toContain('letras maiúsculas');
			expect(result.errors!['rentalPrice']).toContain('positivo');
		});
	});

	describe('userSchema', () => {
		it('should validate correct user data', () => {
			const validUser = {
				username: 'admin_user',
				email: 'admin@mrfantasy.com',
				password: 'securepassword123',
				role: 'ADMIN' as const,
				active: true
			};

			const result = validateForm(userSchema, validUser);
			expect(result.success).toBe(true);
		});

		it('should reject invalid user data', () => {
			const invalidUser = {
				username: 'ab',
				email: 'invalid',
				password: '123',
				role: 'INVALID_ROLE'
			};

			const result = validateForm(userSchema, invalidUser);
			expect(result.success).toBe(false);
			expect(result.errors!['username']).toContain('pelo menos 3 caracteres');
			expect(result.errors!['email']).toContain('Email inválido');
			expect(result.errors!['password']).toContain('pelo menos 6 caracteres');
		});
	});
});