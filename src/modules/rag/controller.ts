import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from '../../common/response';
import {
  ImportKnowledgeDto,
  QueryKnowledgeDto,
  SearchKnowledgeDto,
  WikiListDto,
} from './dto/rag.dto';
import { RagService } from './service';

const KNOWLEDGE_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/html',
  'text/markdown',
];

@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (!KNOWLEDGE_FILE_TYPES.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              'Only PDF, DOC, DOCX, TXT, HTML, and Markdown files are supported',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async importKnowledge(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: ImportKnowledgeDto,
  ) {
    return Response.OK(await this.ragService.importKnowledge(file, dto));
  }

  @Get('sources/:sourceId/progress')
  async getProgress(@Param('sourceId') sourceId: string) {
    return Response.OK(await this.ragService.getProgress(sourceId));
  }

  @Get('search')
  async search(@Query() query: SearchKnowledgeDto) {
    return Response.OK(await this.ragService.search(query));
  }

  @Get('wiki')
  async listWiki(@Query() query: WikiListDto) {
    return Response.OK(await this.ragService.listWiki(query));
  }

  @Get('wiki/:slug(*)')
  async getWikiPage(@Param('slug') slug: string) {
    return Response.OK(await this.ragService.getWikiPage(slug));
  }

  @Post('query')
  async query(@Body() dto: QueryKnowledgeDto) {
    return Response.OK(await this.ragService.query(dto));
  }
}
