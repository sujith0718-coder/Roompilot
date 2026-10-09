import { AuditLogEntry, UserRole } from '../../../../shared/types/index.js';

/**
 * Service Boundary: Audit Logging Service
 * Records crucial administrative and allocation history actions.
 */
export interface IAuditService {
  logAction(
    userId: string,
    userRole: UserRole,
    action: string,
    resource: string,
    details?: Record<string, unknown>
  ): Promise<AuditLogEntry>;
}

export class AuditService implements IAuditService {
  public async logAction(
    userId: string,
    userRole: UserRole,
    action: string,
    resource: string,
    details?: Record<string, unknown>
  ): Promise<AuditLogEntry> {
    return {
      id: 'stub_id',
      userId,
      userRole,
      action,
      resource,
      details,
      timestamp: new Date().toISOString(),
    };
  }
}

export const auditService = new AuditService();
