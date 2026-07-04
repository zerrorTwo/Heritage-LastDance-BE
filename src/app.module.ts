import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { redisStore } from 'cache-manager-redis-yet';
import type { CacheModuleOptions } from '@nestjs/cache-manager';
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
import { ChatRoomModule } from './modules/chat-room/module';
import { CommentModule } from './modules/comment/module';
import { DiscussModule } from './modules/discuss/module';
import { FavoriteModule } from './modules/favorite/module';
import { LeaderboardModule } from './modules/leaderboard/module';
import { KnowledgeTestModule } from './modules/knowledge-test/module';
import { ChatGatewayModule } from './gateways/chat-gateway.module';
import { RagModule } from './modules/rag/module';
import { MindMapModule } from './modules/mind-map/module';
import { GraphModule } from './modules/graph/module';
import { GamificationModule } from './modules/gamification/module';
import { FriendModule } from './modules/friend/module';
import { TripModule } from './modules/trip/module';
import { McpTokenModule } from './modules/mcp-token/module';
import { MetricsModule } from './modules/metrics/module';
import { MapGatewayModule } from './modules/map-gateway/module';
import { dbConfig } from './config/database';
import loadEnv from './config/configuration';

const env = loadEnv();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadEnv],
    }),

    TypeOrmModule.forRoot(dbConfig()),

    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (): Promise<CacheModuleOptions> => {
        const redisUrl = process.env.REDIS_URL;
        if (redisUrl) {
          const store = await redisStore({
            url: redisUrl,
            ttl: 60000,
          });
          return { store, ttl: 60 * 1000 };
        }
        return {
          ttl: 60 * 1000,
          max: 500,
        };
      },
    }),

    ThrottlerModule.forRoot({
      ttl: parseInt(String(env.THROTTLE_TTL || '60')) * 1000,
      limit: parseInt(String(env.THROTTLE_LIMIT || '60')),
    }),

    AuthModule,
    UserModule,
    SessionModule,
    AuditLogModule,
    HealthModule,
    MetricsModule,
    HeritageModule,
    HeritageCategoryModule,
    HeritageTranslationModule,
    HeritageMediaModule,
    HeritageLocationModule,
    HeritageTimelineModule,
    HeritageRelationModule,
    BannerModule,
    ChatRoomModule,
    CommentModule,
    DiscussModule,
    FavoriteModule,
    LeaderboardModule,
    KnowledgeTestModule,
    ChatGatewayModule,
    RagModule,
    MindMapModule,
    GraphModule,
    GamificationModule,
    FriendModule,
    TripModule,
    McpTokenModule,
    MapGatewayModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
