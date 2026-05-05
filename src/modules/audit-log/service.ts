import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOG_REPOSITORY } from '../../common/constants/injection-tokens';
import { AuditAction } from './enum';
import type { CreateAuditLogData, IAuditLogRepository } from './model';

@Injectable()
export class AuditLogService {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditRepo: IAuditLogRepository,
  ) {}

  log(data: CreateAuditLogData) {
    return this.auditRepo.create(data);
  }

  logAuthAction(params: {
    userId?: string | null;
    action: AuditAction;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, any> | null;
  }) {
    return this.auditRepo.create({
      userId: params.userId ?? null,
      action: params.action,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      metadata: params.metadata ?? null,
    });
  }
}
