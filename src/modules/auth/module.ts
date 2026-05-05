import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthChallengeModel } from './model';
import { AuthService } from './service';
import { AuthController } from './controller';
import { AuthChallengeRepository } from './repository';
import { AUTH_CHALLENGE_REPOSITORY } from '../../common/constants/injection-tokens';
import { UsersModule } from '../users/module';
import { SessionModule } from '../session/module';
import { AuditLogModule } from '../audit-log/module';
import { MailService } from '../../pkg/mail/mail.service';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { GoogleStrategy } from '../../common/strategies/google.strategy';
import loadEnv from '../../config/configuration';

const env = loadEnv();

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthChallengeModel]),
    PassportModule,
    JwtModule.register({
      secret: env.JWT_SECRET as string,
      signOptions: { expiresIn: (env.JWT_EXPIRES_IN as any) ?? '15m' },
    }),
    UsersModule,
    SessionModule, // provides SESSION_REPOSITORY
    AuditLogModule,
  ],
  providers: [
    AuthService,
    MailService,
    JwtStrategy,
    GoogleStrategy,
    {
      provide: AUTH_CHALLENGE_REPOSITORY,
      useClass: AuthChallengeRepository,
    },
  ],
  controllers: [AuthController],
})
export class AuthModule {}
