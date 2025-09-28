import { json } from '@sveltejs/kit';
import { getAuditLogById } from '$lib/server/auditLog.js';
import type { RequestHandler } from './$types';

/**
 * GET /api/audit-logs/[id] - Busca log de auditoria específico
 */
export const GET: RequestHandler = async ({ params, locals }) => {
  // Verificar se o usuário está logado e tem permissão de administrador
  if (!locals.user || (locals.user.role !== 'ADMIN')) {
    return new Response('Não autorizado', { status: 401 });
  }

  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return json({ error: 'ID inválido' }, { status: 400 });
    }

    const log = await getAuditLogById(id);

    if (!log) {
      return json({ error: 'Log não encontrado' }, { status: 404 });
    }

    return json(log);
  } catch (error) {
    console.error('Erro ao buscar log de auditoria:', error);
    return json({ error: 'Erro ao buscar log de auditoria' }, { status: 500 });
  }
};