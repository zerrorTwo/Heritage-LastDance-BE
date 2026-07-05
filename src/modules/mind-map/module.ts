import { Module } from '@nestjs/common';
import { MindMapController } from './controller';
import { MindMapService } from './service';
import { PromptBuilder } from './prompt.builder';
import { ResponseValidator } from './response.validator';

@Module({
  controllers: [MindMapController],
  providers: [MindMapService, PromptBuilder, ResponseValidator],
  exports: [MindMapService],
})
export class MindMapModule {}
