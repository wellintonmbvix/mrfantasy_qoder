// Error types for different scenarios
export interface AppError {
	code: string;
	message: string;
	details?: any;
}

export class ValidationError extends Error {
	constructor(public errors: Record<string, string>) {
		super('Validation failed');
		this.name = 'ValidationError';
	}
}

export class APIError extends Error {
	constructor(
		public status: number,
		message: string,
		public code?: string
	) {
		super(message);
		this.name = 'APIError';
	}
}

// Error handling utilities
export function handleAPIError(error: any): AppError {
	if (error instanceof APIError) {
		return {
			code: error.code || 'API_ERROR',
			message: error.message
		};
	}

	if (error instanceof ValidationError) {
		return {
			code: 'VALIDATION_ERROR',
			message: 'Dados inválidos',
			details: error.errors
		};
	}

	// Network errors
	if (error.name === 'TypeError' && error.message.includes('fetch')) {
		return {
			code: 'NETWORK_ERROR',
			message: 'Erro de conexão. Verifique sua internet.'
		};
	}

	// Default error
	return {
		code: 'UNKNOWN_ERROR',
		message: error.message || 'Erro inesperado'
	};
}

// API response handler
export async function handleAPIResponse(response: Response) {
	const data = await response.json();

	if (!response.ok) {
		throw new APIError(
			response.status,
			data.error || 'Erro no servidor',
			data.code
		);
	}

	return data;
}

// Form submission error handler
export function handleFormError(error: any): {
	fieldErrors: Record<string, string>;
	generalError: string | null;
} {
	const appError = handleAPIError(error);

	if (appError.code === 'VALIDATION_ERROR' && appError.details) {
		return {
			fieldErrors: appError.details,
			generalError: null
		};
	}

	return {
		fieldErrors: {},
		generalError: appError.message
	};
}

// Database error messages
export const DATABASE_ERROR_MESSAGES: Record<string, string> = {
	'P2002': 'Este registro já existe',
	'P2003': 'Referência inválida',
	'P2025': 'Registro não encontrado',
	'P2014': 'A operação falhou devido a dependências',
	'P2016': 'Erro de consulta no banco de dados',
	'P2017': 'Registros relacionados não encontrados'
};

export function getDatabaseErrorMessage(error: any): string {
	if (error.code && DATABASE_ERROR_MESSAGES[error.code]) {
		return DATABASE_ERROR_MESSAGES[error.code];
	}

	if (error.message?.includes('Unique constraint')) {
		return 'Este registro já existe';
	}

	if (error.message?.includes('Foreign key constraint')) {
		return 'Operação inválida devido a dependências';
	}

	return 'Erro no banco de dados';
}

// Common validation messages
export const VALIDATION_MESSAGES = {
	REQUIRED: 'Campo obrigatório',
	EMAIL_INVALID: 'Email inválido',
	PASSWORD_TOO_SHORT: 'Senha deve ter pelo menos 6 caracteres',
	PASSWORD_MISMATCH: 'Senhas não coincidem',
	PHONE_INVALID: 'Telefone inválido',
	CPF_INVALID: 'CPF inválido',
	DATE_INVALID: 'Data inválida',
	DATE_FUTURE: 'Data deve ser futura',
	PRICE_INVALID: 'Preço inválido',
	QUANTITY_INVALID: 'Quantidade inválida'
} as const;