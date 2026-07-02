import { Injectable, Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { McpTokenModel } from './model';
import { McpTokenRepository } from './repository';
import { McpTokenService } from './service';
import { McpTokenController } from './controller';

@Injectable()
export class McpTokenSchemaBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(McpTokenSchemaBootstrap.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      this.logger.log('Checking and applying schema updates for user_mcp_tokens...');
      await this.dataSource.query(
        `ALTER TABLE user_mcp_tokens ADD COLUMN IF NOT EXISTS scopes text`,
      );
      this.logger.log('user_mcp_tokens schema is up to date.');
    } catch (err) {
      this.logger.error(
        `Failed to run mcp-token schema bootstrap: ${(err as Error).message}`,
      );
    }
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([McpTokenModel])],
  controllers: [McpTokenController],
  providers: [McpTokenRepository, McpTokenService, McpTokenSchemaBootstrap],
  exports: [McpTokenService],
})
export class McpTokenModule {}
