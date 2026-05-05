import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AUDIT_LOG_REPOSITORY } from '../../common/constants/injection-tokens';
import { AuditLogModel } from './model';
import { AuditLogRepository } from './repository';
import { AuditLogService } from './service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogModel])],
  providers: [
    AuditLogService,
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: AuditLogRepository,
    },
  ],
  exports: [AUDIT_LOG_REPOSITORY, AuditLogService],
})
export class AuditLogModule {}
