import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogModel } from './model';
import type { CreateAuditLogData, IAuditLogRepository } from './model';

@Injectable()
export class AuditLogRepository implements IAuditLogRepository {
  constructor(
    @InjectRepository(AuditLogModel)
    private readonly repo: Repository<AuditLogModel>,
  ) {}

  async create(data: CreateAuditLogData): Promise<AuditLogModel> {
    const audit = this.repo.create({
      userId: data.userId ?? null,
      action: data.action,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      metadata: data.metadata ?? null,
    });

    return this.repo.save(audit);
  }
}
