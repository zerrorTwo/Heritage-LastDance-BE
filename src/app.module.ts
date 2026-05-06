import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/module';
import { UserModule } from './modules/user/module';
import { SessionModule } from './modules/session/module';
import { AuditLogModule } from './modules/audit-log/module';
import { HealthModule } from './modules/health/module';
import { BannerModule } from './modules/banner/module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USER || 'aioz',
      password: process.env.DATABASE_PASS || 'aiozpass',
      database: process.env.DATABASE_NAME || 'aioz_map',
      autoLoadEntities: true,
      synchronize: true,
    }),
    AuthModule,
    UserModule,
    SessionModule,
    AuditLogModule,
    HealthModule,
    BannerModule,
  ],
})
export class AppModule {}