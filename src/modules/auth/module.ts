import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './controller';
import { AuthService } from './service';
import { AuthRepository } from './repository';
import { AuthChallengeModel, PasswordResetModel } from './model';

import { SessionModel } from '../session/model';
import { SessionRepository } from '../session/repository';

import { UserModel } from '../user/model';
import { UserRepository } from '../user/repository';

import { AuditLogModel } from '../audit-log/model';
import { AuditLogRepository } from '../audit-log/repository';

import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { GoogleStrategy } from '../../common/strategies/google.strategy';
import { MailModule } from '../../pkg/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuthChallengeModel,
      PasswordResetModel,
      SessionModel,
      UserModel,
      AuditLogModel,
    ]),
    JwtModule.registerAsync({
      imports: [],
      inject: [],
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'dev-secret-key',
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '1h' },
      }),
    }),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    SessionRepository,
    UserRepository,
    AuditLogRepository,
    JwtStrategy,
    GoogleStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}