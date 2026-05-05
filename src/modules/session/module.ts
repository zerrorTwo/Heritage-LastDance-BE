import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionModel } from './model';
import { SessionRepository } from './repository';
import { SESSION_REPOSITORY } from '../../common/constants/injection-tokens';

/**
 * SessionModule — data layer only.
 *
 * Intentionally contains only:
 *  - session model/entity
 *  - repository interface + implementation
 *
 * No service, no controller.
 * Exported so AuthModule can inject SESSION_REPOSITORY.
 */
@Module({
  imports: [TypeOrmModule.forFeature([SessionModel])],
  providers: [
    {
      provide: SESSION_REPOSITORY,
      useClass: SessionRepository,
    },
  ],
  exports: [SESSION_REPOSITORY],
})
export class SessionModule {}
