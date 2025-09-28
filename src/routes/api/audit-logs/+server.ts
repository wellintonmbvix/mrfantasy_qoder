import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/database.js';
import { getAuditLogs, getAuditLogById } from '$lib/server/auditLog.js';
import type { RequestHandler } from './$types';

/**
 * GET /api/audit-logs - Lista logs de auditoria com filtros
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  // Verificar se o usuário está logado e tem permissão de administrador
  if (!locals.user || (locals.user.role !== 'ADMIN')) {
    return new Response('Não autorizado', { status: 401 });
  }

  try {
    const startDateStr = url.searchParams.get('startDate');
    const endDateStr = url.searchParams.get('endDate');
    const module = url.searchParams.get('module') as any;
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const limit = parseInt(url.searchParams.get('limit') ?? '20');

    const filters: any = {
      page,
      limit
    };

    if (startDateStr) {
      filters.startDate = new Date(startDateStr);
    }

    if (endDateStr) {
      filters.endDate = new Date(endDateStr);
    }

    if (module) {
      filters.module = module;
    }

    const result = await getAuditLogs(filters);

    return json(result);
  } catch (error) {
    console.error('Erro ao buscar logs de auditoria:', error);
    return json({ error: 'Erro ao buscar logs de auditoria' }, { status: 500 });
  }
};