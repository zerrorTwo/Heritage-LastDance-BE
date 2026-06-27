import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { McpTokenModel } from './model';
import { McpTokenRepository } from './repository';
import { McpTokenService } from './service';
import { McpTokenController } from './controller';

@Module({
  imports: [TypeOrmModule.forFeature([McpTokenModel])],
  controllers: [McpTokenController],
  providers: [McpTokenRepository, McpTokenService],
  exports: [McpTokenService],
})
export class McpTokenModule {}
