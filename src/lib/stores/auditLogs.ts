import { writable } from 'svelte/store';
import type { AuditLogEntryWithUser, AuditModule } from '$lib/server/auditLog';

interface AuditLogState {
  logs: AuditLogEntryWithUser[];
  currentLog: AuditLogEntryWithUser | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null;
  filters: {
    startDate?: string;
    endDate?: string;
    module?: AuditModule;
    page: number;
    limit: number;
  };
  loading: boolean;
  error: string | null;
}

interface AuditLogFilters {
  startDate?: string;
  endDate?: string;
  module?: AuditModule;
  page?: number;
  limit?: number;
}

// Estado inicial
const initialState: AuditLogState = {
  logs: [],
  currentLog: null,
  pagination: null,
  filters: {
    page: 1,
    limit: 20
  },
  loading: false,
  error: null
};

// Store principal
export const auditLogs = writable<AuditLogState>(initialState);

// Funções auxiliares
function setLoading(loading: boolean) {
  auditLogs.update(state => ({ ...state, loading, error: null }));
}

function setError(error: string) {
  auditLogs.update(state => ({ ...state, error, loading: false }));
}

// Ações do store
export const auditLogActions = {
  // Buscar logs com filtros
  async fetchLogs(filters?: AuditLogFilters) {
    setLoading(true);
    
    try {
      const searchParams = new URLSearchParams();
      
      if (filters?.startDate) searchParams.append('startDate', filters.startDate);
      if (filters?.endDate) searchParams.append('endDate', filters.endDate);
      if (filters?.module) searchParams.append('module', filters.module);
      if (filters?.page) searchParams.append('page', filters.page.toString());
      if (filters?.limit) searchParams.append('limit', filters.limit.toString());
      
      const response = await fetch(`/api/audit-logs?${searchParams}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar logs de auditoria');
      }
      
      const data = await response.json();
      
      auditLogs.update(state => ({
        ...state,
        logs: data.logs || [],
        pagination: data.pagination,
        loading: false,
        error: null
      }));
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      setError(error instanceof Error ? error.message : 'Erro ao buscar logs de auditoria');
    }
  },
  
  // Buscar log específico
  async fetchLog(id: number) {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/audit-logs/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar log de auditoria');
      }
      
      const log = await response.json();
      
      auditLogs.update(state => ({
        ...state,
        currentLog: log,
        loading: false,
        error: null
      }));
      
      return log;
    } catch (error) {
      console.error('Erro ao buscar log:', error);
      setError(error instanceof Error ? error.message : 'Erro ao buscar log de auditoria');
      throw error;
    }
  },
  
  // Limpar erro
  clearError() {
    auditLogs.update(state => ({ ...state, error: null }));
  },
  
  // Resetar filtros
  resetFilters() {
    auditLogs.update(state => ({
      ...state,
      filters: { ...initialState.filters }
    }));
  },
  
  // Definir filtros
  setFilters(filters: Partial<AuditLogFilters>) {
    auditLogs.update(state => ({
      ...state,
      filters: { ...state.filters, ...filters }
    }));
  }
};