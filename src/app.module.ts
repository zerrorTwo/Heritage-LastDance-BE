import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/module';
import { UserModule } from './modules/user/module';
import { SessionModule } from './modules/session/module';
import { AuditLogModule } from './modules/audit-log/module';
import { HealthModule } from './modules/health/module';
import { HeritageModule } from './modules/heritage/module';
import { HeritageCategoryModule } from './modules/heritage_category/module';
import { HeritageTranslationModule } from './modules/heritage_translation/module';
import { HeritageMediaModule } from './modules/heritage_media/module';
import { HeritageLocationModule } from './modules/heritage_location/module';
import { HeritageTimelineModule } from './modules/heritage_timeline/module';
import { HeritageRelationModule } from './modules/heritage_relation/module';
import { BannerModule } from './modules/banner/module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
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
    HeritageModule,
    HeritageCategoryModule,
    HeritageTranslationModule,
    HeritageMediaModule,
    HeritageLocationModule,
    HeritageTimelineModule,
    HeritageRelationModule,
    BannerModule,
  ],
})
export class AppModule {}