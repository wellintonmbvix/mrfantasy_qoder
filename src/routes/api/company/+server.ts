import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/database';
import { companySchema, validateForm } from '$lib/utils/validation';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'suaSenhaMaisFraca@123';

// Função para verificar token JWT
function verifyToken(token: string): any {
	try {
		return jwt.verify(token, JWT_SECRET);
	} catch {
		return null;
	}
}

// GET - Buscar dados da empresa
export const GET: RequestHandler = async ({ request, cookies }) => {
	try {
		// Verificar autenticação via cookie
		const token = cookies.get('auth-token');
		if (!token) {
			return error(401, { message: 'Token não encontrado' });
		}

		const user = verifyToken(token);
		if (!user) {
			return error(401, { message: 'Token inválido ou expirado' });
		}

		// Verificar se o usuário tem permissão (ADMIN ou MANAGER)
		if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
			return error(403, { message: 'Acesso negado. Apenas administradores e gerentes podem acessar os dados da empresa.' });
		}

		// Buscar dados da empresa (sempre haverá apenas um registro)
		const company = await (prisma as any).company.findFirst();

		return json({ company });
	} catch (err) {
		console.error('Erro ao buscar dados da empresa:', err);
		return error(500, { message: 'Erro interno do servidor' });
	}
};

// POST - Criar dados da empresa (caso não exista)
export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		// Verificar autenticação via cookie
		const token = cookies.get('auth-token');
		if (!token) {
			return error(401, { message: 'Token não encontrado' });
		}

		const user = verifyToken(token);
		if (!user) {
			return error(401, { message: 'Token inválido ou expirado' });
		}

		// Verificar se o usuário tem permissão (ADMIN ou MANAGER)
		if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
			return error(403, { message: 'Acesso negado. Apenas administradores e gerentes podem gerenciar dados da empresa.' });
		}

		// Verificar se já existe uma empresa cadastrada
		const existingCompany = await (prisma as any).company.findFirst();
		if (existingCompany) {
			return error(400, { message: 'Dados da empresa já existem. Use PUT para atualizar.' });
		}

		const body = await request.json();

		// Validar dados
		const validation = validateForm(companySchema, body);
		if (!validation.success) {
			return json({ message: 'Dados inválidos', errors: validation.errors }, { status: 400 });
		}

		// Criar empresa
		const company = await (prisma as any).company.create({
			data: validation.data!
		});

		return json({ 
			message: 'Dados da empresa criados com sucesso',
			company
		}, { status: 201 });

	} catch (err) {
		console.error('Erro ao criar dados da empresa:', err);
		return error(500, { message: 'Erro interno do servidor' });
	}
};

// PUT - Atualizar dados da empresa
export const PUT: RequestHandler = async ({ request, cookies }) => {
	try {
		// Verificar autenticação via cookie
		const token = cookies.get('auth-token');
		if (!token) {
			return error(401, { message: 'Token não encontrado' });
		}

		const user = verifyToken(token);
		if (!user) {
			return error(401, { message: 'Token inválido ou expirado' });
		}

		// Verificar se o usuário tem permissão (ADMIN ou MANAGER)
		if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
			return error(403, { message: 'Acesso negado. Apenas administradores e gerentes podem gerenciar dados da empresa.' });
		}

		// Verificar se existe empresa cadastrada
		const existingCompany = await (prisma as any).company.findFirst();
		if (!existingCompany) {
			return error(404, { message: 'Dados da empresa não encontrados. Use POST para criar.' });
		}

		const body = await request.json();

		// Validar dados
		const validation = validateForm(companySchema, body);
		if (!validation.success) {
			return json({ message: 'Dados inválidos', errors: validation.errors }, { status: 400 });
		}

		// Atualizar empresa
		const company = await (prisma as any).company.update({
			where: { id: existingCompany.id },
			data: validation.data!
		});

		return json({ 
			message: 'Dados da empresa atualizados com sucesso',
			company
		});

	} catch (err) {
		console.error('Erro ao atualizar dados da empresa:', err);
		return error(500, { message: 'Erro interno do servidor' });
	}
};