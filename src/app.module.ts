import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR, RouterModule } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { dbConfig } from './config/database';
import loadEnv from './config/configuration';
import { LoggerMiddleware } from './middlewares/logger.middleware';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

import { AuthModule } from './modules/auth/module';
import { UsersModule } from './modules/users/module';
import { SessionModule } from './modules/session/module';
import { HealthModule } from './modules/health/module';

const env = loadEnv();

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [loadEnv] }),
    TypeOrmModule.forRoot(dbConfig()),

    // Global rate limiting — default: 100 req / 60s
    ThrottlerModule.forRoot([
      {
        ttl: Number(env.THROTTLE_TTL ?? 60) * 1000,
        limit: Number(env.THROTTLE_LIMIT ?? 100),
      },
    ]),

    // Feature modules
    AuthModule,
    UsersModule,
    SessionModule,
    HealthModule,

    // Route prefixes
    RouterModule.register([
      { path: 'auth', module: AuthModule },
      { path: 'users', module: UsersModule },
      { path: '', module: HealthModule },
    ]),
  ],
  providers: [
    // Global response envelope { status: 'success', data, message }
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    // Global JWT guard — skip @Public() routes
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global rate-limit guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
