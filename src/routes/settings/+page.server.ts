import { redirect, fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/database';
import { settingsSchema, validateForm } from '$lib/utils/validation';
import type { Actions } from '@sveltejs/kit';

export const load = async ({ locals }: { locals: any }) => {
	// Verificar se usuário está logado
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	// Verificar se o usuário tem permissão (ADMIN ou MANAGER)
	if (locals.user.role !== 'ADMIN' && locals.user.role !== 'MANAGER') {
		throw redirect(302, '/dashboard');
	}

	// Buscar configurações do sistema se existirem
	const settings = await (prisma as any).settings.findFirst();

	return {
		settings,
		user: locals.user
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		// Verificar se usuário está logado
		if (!locals.user) {
			return fail(401, { 
				message: 'Usuário não autenticado' 
			});
		}

		// Verificar se o usuário tem permissão (ADMIN ou MANAGER)
		if (locals.user.role !== 'ADMIN' && locals.user.role !== 'MANAGER') {
			return fail(403, { 
				message: 'Acesso negado. Apenas administradores e gerentes podem gerenciar configurações do sistema.' 
			});
		}

		try {
			const formData = await request.formData();
			
			// Converter FormData para objeto
			const data = {
				databaseVersion: parseInt(formData.get('databaseVersion') as string, 10),
				receiptInBobina: formData.get('receiptInBobina') === 'on',
				inhibitSurcharge: formData.get('inhibitSurcharge') === 'on'
			};

			// Validar dados
			const validation = validateForm(settingsSchema, data);
			if (!validation.success) {
				return fail(400, {
					message: 'Dados inválidos',
					errors: validation.errors,
					data
				});
			}

			// Verificar se já existem configurações
			const existingSettings = await (prisma as any).settings.findFirst();

			let savedSettings;
			if (existingSettings) {
				// Atualizar configurações existentes
				savedSettings = await (prisma as any).settings.update({
					where: { id: existingSettings.id },
					data: validation.data!
				});
			} else {
				// Criar novas configurações
				savedSettings = await (prisma as any).settings.create({
					data: validation.data!
				});
			}

			return {
				success: true,
				message: 'Configurações do sistema salvas com sucesso!',
				settings: savedSettings
			};

		} catch (error) {
			console.error('Erro ao salvar configurações do sistema:', error);
			return fail(500, {
				message: 'Erro interno do servidor'
			});
		}
	}
};