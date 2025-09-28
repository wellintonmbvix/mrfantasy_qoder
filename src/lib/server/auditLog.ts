import { prisma } from '$lib/server/database.js';

export type AuditActionType = 'CREATE' | 'UPDATE' | 'DELETE';
export type AuditModule = 
  | 'customers' 
  | 'employees' 
  | 'orders' 
  | 'products' 
  | 'users' 
  | 'cash-transactions'
  | 'payment-methods'
  | 'groups'
  | 'company'
  | 'settings';

export interface AuditLogEntry {
  id?: number;
  timestamp: Date;
  module: AuditModule;
  actionType: AuditActionType;
  originalData?: any;
  newData?: any;
  userId: number;
  ipAddress?: string;
  userAgent?: string;
}

// Extended interface for audit log entries with user data from API
export interface AuditLogEntryWithUser extends AuditLogEntry {
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

/**
 * Cria um novo registro de log de auditoria
 */
export async function createAuditLog(logEntry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        module: logEntry.module,
        actionType: logEntry.actionType,
        originalData: logEntry.originalData ? JSON.stringify(logEntry.originalData) : null,
        newData: logEntry.newData ? JSON.stringify(logEntry.newData) : null,
        userId: logEntry.userId,
        ipAddress: logEntry.ipAddress || null,
        userAgent: logEntry.userAgent || null
      }
    });
  } catch (error) {
    console.error('Erro ao criar log de auditoria:', error);
    // Não lançamos erro pois o log de auditoria não deve impedir a operação principal
  }
}

/**
 * Busca logs de auditoria com filtros
 */
export async function getAuditLogs(filters?: {
  startDate?: Date;
  endDate?: Date;
  module?: AuditModule;
  page?: number;
  limit?: number;
}) {
  try {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }
    
    if (filters?.module) {
      where.module = filters.module;
    }
    
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          timestamp: 'desc'
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true
            }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);
    
    return {
      logs: logs.map(log => ({
        ...log,
        originalData: log.originalData ? JSON.parse(log.originalData) : null,
        newData: log.newData ? JSON.parse(log.newData) : null
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Erro ao buscar logs de auditoria:', error);
    throw error;
  }
}

/**
 * Busca um log de auditoria específico por ID
 */
export async function getAuditLogById(id: number) {
  try {
    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true
          }
        }
      }
    });
    
    if (!log) {
      return null;
    }
    
    return {
      ...log,
      originalData: log.originalData ? JSON.parse(log.originalData) : null,
      newData: log.newData ? JSON.parse(log.newData) : null
    };
  } catch (error) {
    console.error('Erro ao buscar log de auditoria por ID:', error);
    throw error;
  }
}