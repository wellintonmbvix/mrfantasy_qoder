import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/database';
import { settingsSchema, validateForm } from '$lib/utils/validation';
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

// GET - Buscar configurações do sistema
export const GET: RequestHandler = async ({ request, cookies, url }) => {
	try {
		// Verificar se é uma consulta pública (apenas para receiptInBobina)
		const publicQuery = url.searchParams.get('public') === 'true';
		
		if (publicQuery) {
			// Para consultas públicas, retornar apenas receiptInBobina
			const settings = await (prisma as any).settings.findFirst({
				select: {
					receiptInBobina: true
				}
			});
			
			// Se não há configurações, retornar valor padrão
			const result = settings || { receiptInBobina: false };
			return json({ settings: result });
		}
		
		// Para consultas completas, verificar autenticação
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
			return error(403, { message: 'Acesso negado. Apenas administradores e gerentes podem acessar as configurações do sistema.' });
		}

		// Buscar configurações completas do sistema
		const settings = await (prisma as any).settings.findFirst();

		return json({ settings });
	} catch (err) {
		console.error('Erro ao buscar configurações do sistema:', err);
		return error(500, { message: 'Erro interno do servidor' });
	}
};

// POST - Criar configurações do sistema (caso não existam)
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
			return error(403, { message: 'Acesso negado. Apenas administradores e gerentes podem gerenciar configurações do sistema.' });
		}

		// Verificar se já existem configurações
		const existingSettings = await (prisma as any).settings.findFirst();
		if (existingSettings) {
			return error(400, { message: 'Configurações já existem. Use PUT para atualizar.' });
		}

		const body = await request.json();

		// Validar dados
		const validation = validateForm(settingsSchema, body);
		if (!validation.success) {
			return json({ message: 'Dados inválidos', errors: validation.errors }, { status: 400 });
		}

		// Criar configurações
		const settings = await (prisma as any).settings.create({
			data: validation.data!
		});

		return json({ 
			message: 'Configurações do sistema criadas com sucesso',
			settings
		}, { status: 201 });

	} catch (err) {
		console.error('Erro ao criar configurações do sistema:', err);
		return error(500, { message: 'Erro interno do servidor' });
	}
};

// PUT - Atualizar configurações do sistema
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
			return error(403, { message: 'Acesso negado. Apenas administradores e gerentes podem gerenciar configurações do sistema.' });
		}

		// Verificar se existem configurações
		const existingSettings = await (prisma as any).settings.findFirst();
		if (!existingSettings) {
			return error(404, { message: 'Configurações não encontradas. Use POST para criar.' });
		}

		const body = await request.json();

		// Validar dados
		const validation = validateForm(settingsSchema, body);
		if (!validation.success) {
			return json({ message: 'Dados inválidos', errors: validation.errors }, { status: 400 });
		}

		// Atualizar configurações
		const settings = await (prisma as any).settings.update({
			where: { id: existingSettings.id },
			data: validation.data!
		});

		return json({ 
			message: 'Configurações do sistema atualizadas com sucesso',
			settings
		});

	} catch (err) {
		console.error('Erro ao atualizar configurações do sistema:', err);
		return error(500, { message: 'Erro interno do servidor' });
	}
};