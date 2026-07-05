import { Module } from '@nestjs/common';
import { RagController } from './controller';
import { RagService } from './service';

@Module({
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
