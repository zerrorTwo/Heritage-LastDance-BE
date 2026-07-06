import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GenerateMindMapDto } from './dto/generate-mind-map.dto';
import { MindMapService } from './service';
import { Response } from '../../common/response';

@Controller('ai')
@ApiTags('AI')
export class MindMapController {
  constructor(private readonly mindMapService: MindMapService) {}

  @Post('mind-map')
  @ApiOperation({
    summary: 'Generate a mind map from text',
    description:
      'Converts educational text into a structured mind map using AI. Returns a validated JSON tree with title and mindMap nodes.',
  })
  @ApiResponse({
    status: 201,
    description: 'Mind map generated successfully',
    schema: {
      properties: {
        data: {
          type: 'object',
          properties: {
            title: { type: 'string', example: 'Địa đạo Củ Chi' },
            mindMap: {
              type: 'object',
              description: 'Root node of the mind map tree',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input text' })
  @ApiResponse({ status: 502, description: 'DeepSeek API unavailable or returned invalid response' })
  async generateMindMap(@Body() dto: GenerateMindMapDto) {
    const result = await this.mindMapService.generate(dto);
    return Response.Created(result);
  }
}
