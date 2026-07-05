import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogModel, IAuditLogRepository, CreateAuditLogData } from './model';

@Injectable()
export class AuditLogRepository implements IAuditLogRepository {
  constructor(
    @InjectRepository(AuditLogModel)
    private readonly repo: Repository<AuditLogModel>,
  ) {}

  async create(data: CreateAuditLogData): Promise<AuditLogModel> {
    return this.repo.save(data);
  }
}