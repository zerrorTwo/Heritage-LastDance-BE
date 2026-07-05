import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionModel } from './model';
import { SessionRepository } from './repository';

@Module({
  imports: [TypeOrmModule.forFeature([SessionModel])],
  providers: [SessionRepository],
  exports: [SessionRepository],
})
export class SessionModule {}