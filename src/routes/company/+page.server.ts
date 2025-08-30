import { redirect, fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/database';
import { companySchema, validateForm } from '$lib/utils/validation';
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

	// Buscar dados da empresa se existirem
	const company = await (prisma as any).company.findFirst();

	return {
		company,
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
				message: 'Acesso negado. Apenas administradores e gerentes podem gerenciar dados da empresa.' 
			});
		}

		try {
			const formData = await request.formData();
			
			// Converter FormData para objeto
			const data = {
				razaoSocial: formData.get('razaoSocial') as string,
				nomeFantasia: formData.get('nomeFantasia') as string,
				endereco: formData.get('endereco') as string,
				numero: formData.get('numero') as string,
				complemento: formData.get('complemento') as string || '',
				bairro: formData.get('bairro') as string,
				cidade: formData.get('cidade') as string,
				estado: formData.get('estado') as string,
				cep: formData.get('cep') as string,
				telefone1: formData.get('telefone1') as string,
				telefone2: formData.get('telefone2') as string || '',
				cnpj: formData.get('cnpj') as string,
				inscricaoEstadual: formData.get('inscricaoEstadual') as string || '',
				observacaoAluguel: formData.get('observacaoAluguel') as string || ''
			};

			// Validar dados
			const validation = validateForm(companySchema, data);
			if (!validation.success) {
				return fail(400, {
					message: 'Dados inválidos',
					errors: validation.errors,
					data
				});
			}

			// Verificar se já existe uma empresa
			const existingCompany = await (prisma as any).company.findFirst();

			let savedCompany;
			if (existingCompany) {
				// Atualizar dados existentes
				savedCompany = await (prisma as any).company.update({
					where: { id: existingCompany.id },
					data: validation.data!
				});
			} else {
				// Criar nova empresa
				savedCompany = await (prisma as any).company.create({
					data: validation.data!
				});
			}

			return {
				success: true,
				message: 'Dados da empresa salvos com sucesso!',
				company: savedCompany
			};

		} catch (error) {
			console.error('Erro ao salvar dados da empresa:', error);
			return fail(500, {
				message: 'Erro interno do servidor'
			});
		}
	}
};