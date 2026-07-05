import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModel } from './model';
import { AuditLogRepository } from './repository';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogModel])],
  providers: [AuditLogRepository],
  exports: [AuditLogRepository],
})
export class AuditLogModule {}