import { describe, it, expect } from 'vitest';
import { 
	ValidationError, 
	APIError, 
	handleAPIError, 
	handleFormError,
	getDatabaseErrorMessage 
} from '$lib/utils/errors';

describe('Error Handling Utilities', () => {
	describe('ValidationError', () => {
		it('should create validation error with field errors', () => {
			const errors = { name: 'Nome é obrigatório', email: 'Email inválido' };
			const error = new ValidationError(errors);
			
			expect(error.name).toBe('ValidationError');
			expect(error.message).toBe('Validation failed');
			expect(error.errors).toEqual(errors);
		});
	});

	describe('APIError', () => {
		it('should create API error with status and message', () => {
			const error = new APIError(400, 'Bad Request', 'INVALID_DATA');
			
			expect(error.name).toBe('APIError');
			expect(error.status).toBe(400);
			expect(error.message).toBe('Bad Request');
			expect(error.code).toBe('INVALID_DATA');
		});
	});

	describe('handleAPIError', () => {
		it('should handle APIError correctly', () => {
			const apiError = new APIError(400, 'Invalid request', 'BAD_REQUEST');
			const result = handleAPIError(apiError);
			
			expect(result.code).toBe('BAD_REQUEST');
			expect(result.message).toBe('Invalid request');
		});

		it('should handle ValidationError correctly', () => {
			const validationError = new ValidationError({
				name: 'Nome inválido',
				email: 'Email inválido'
			});
			const result = handleAPIError(validationError);
			
			expect(result.code).toBe('VALIDATION_ERROR');
			expect(result.message).toBe('Dados inválidos');
			expect(result.details).toEqual({
				name: 'Nome inválido',
				email: 'Email inválido'
			});
		});

		it('should handle network errors', () => {
			const networkError = new TypeError('fetch is not defined');
			const result = handleAPIError(networkError);
			
			expect(result.code).toBe('NETWORK_ERROR');
			expect(result.message).toContain('conexão');
		});

		it('should handle unknown errors', () => {
			const unknownError = new Error('Something went wrong');
			const result = handleAPIError(unknownError);
			
			expect(result.code).toBe('UNKNOWN_ERROR');
			expect(result.message).toBe('Something went wrong');
		});
	});

	describe('handleFormError', () => {
		it('should extract field errors from validation error', () => {
			const validationError = new ValidationError({
				name: 'Nome é obrigatório',
				email: 'Email inválido'
			});
			
			const result = handleFormError(validationError);
			
			expect(result.fieldErrors).toEqual({
				name: 'Nome é obrigatório',
				email: 'Email inválido'
			});
			expect(result.generalError).toBeNull();
		});

		it('should return general error for non-validation errors', () => {
			const apiError = new APIError(500, 'Internal server error');
			const result = handleFormError(apiError);
			
			expect(result.fieldErrors).toEqual({});
			expect(result.generalError).toBe('Internal server error');
		});
	});

	describe('getDatabaseErrorMessage', () => {
		it('should return specific message for known Prisma error codes', () => {
			const uniqueConstraintError = { code: 'P2002' };
			const result = getDatabaseErrorMessage(uniqueConstraintError);
			expect(result).toBe('Este registro já existe');
		});

		it('should handle unique constraint errors by message', () => {
			const error = { message: 'Unique constraint failed on the fields: (`email`)' };
			const result = getDatabaseErrorMessage(error);
			expect(result).toBe('Este registro já existe');
		});

		it('should handle foreign key constraint errors', () => {
			const error = { message: 'Foreign key constraint failed on the field: `customerId`' };
			const result = getDatabaseErrorMessage(error);
			expect(result).toBe('Operação inválida devido a dependências');
		});

		it('should return default message for unknown database errors', () => {
			const unknownError = { message: 'Unknown database error' };
			const result = getDatabaseErrorMessage(unknownError);
			expect(result).toBe('Erro no banco de dados');
		});
	});
});