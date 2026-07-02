import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response as ExpressResponse } from 'express';
import { GraphService } from './service';
import { PersonaService } from './persona.service';
import { Response } from '../../common/response';
import { PersonaChatDto } from './dto/persona-chat.dto';

/**
 * GraphController — API "Vietnam Historical Universe".
 * Route public (chỉ qua ThrottlerGuard toàn cục), FE gọi trực tiếp.
 */
@ApiTags('Historical Graph')
@Controller('graph')
export class GraphController {
  constructor(
    private readonly graphService: GraphService,
    private readonly personaService: PersonaService,
  ) {}

  @Get('map-locations')
  @ApiOperation({ summary: 'Các điểm lịch sử trên bản đồ (+ego graph), lọc theo khoảng năm' })
  @ApiQuery({ name: 'from', required: false, type: Number })
  @ApiQuery({ name: 'to', required: false, type: Number })
  async getMapLocations(@Query('from') from?: string, @Query('to') to?: string) {
    const f = from != null && from !== '' ? Number(from) : undefined;
    const t = to != null && to !== '' ? Number(to) : undefined;
    const items = await this.graphService.getMapLocations(f, t);
    return Response.OK({ items, source: this.graphService.source() });
  }

  @Get('overview-stats')
  @ApiOperation({ summary: 'Thống kê tổng quan (số trận chiến, nhân vật, quan hệ...)' })
  async getOverviewStats() {
    const items = await this.graphService.getOverviewStats();
    return Response.OK(items);
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Dòng thời gian các sự kiện/trận đánh (sắp theo năm)' })
  async getTimeline() {
    const items = await this.graphService.getTimeline();
    return Response.OK(items);
  }

  @Get('full')
  @ApiOperation({ summary: 'Toàn bộ đồ thị {nodes, links} cho explorer' })
  async getFullGraph() {
    const graph = await this.graphService.getFullGraph();
    return Response.OK({ ...graph, source: this.graphService.source() });
  }

  @Get('node/:id/neighbors')
  @ApiOperation({ summary: 'Mạng lưới quan hệ 1 hop quanh một node' })
  async getNeighbors(@Param('id') id: string) {
    const result = await this.graphService.getNeighbors(id);
    return Response.OK(result);
  }

  // ── A3: Chatbot nhân vật lịch sử nhập vai ──

  @Get('personas')
  @ApiOperation({ summary: 'Danh sách nhân vật có thể trò chuyện' })
  async listPersonas() {
    return Response.OK({ items: this.personaService.listPersonas(), llm: this.personaService.hasLLM() });
  }

  @Get('persona/:id')
  @ApiOperation({ summary: 'Thông tin nhân vật + quan hệ' })
  async getPersona(@Param('id') id: string) {
    return Response.OK(this.personaService.getPersona(id));
  }

  @Post('persona/:id/chat')
  @ApiOperation({ summary: 'Trò chuyện nhập vai (stream SSE từng cụm chữ)' })
  async chatPersona(
    @Param('id') id: string,
    @Body() dto: PersonaChatDto,
    @Res() res: ExpressResponse,
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const send = (obj: Record<string, any>) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

    try {
      const meta = await this.personaService.streamAnswer(id, dto.question || '', (delta) =>
        send({ delta }),
      );
      send({ done: true, ...meta });
    } catch (err) {
      send({ error: (err as Error).message });
    } finally {
      res.end();
    }
  }
}
