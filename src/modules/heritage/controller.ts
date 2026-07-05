import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseInterceptors, CacheInterceptor } from '@nestjs/common';
import { HeritageService } from './service';
import { CreateHeritageDto } from './dto/create-heritage.dto';
import { UpdateHeritageDto } from './dto/update-heritage.dto';

@Controller('heritage')
export class HeritageController {
  constructor(private readonly heritageService: HeritageService) {}

  @Get('slug/:slug')
  @UseInterceptors(CacheInterceptor)
  async getHeritageBySlug(@Param('slug') slug: string) {
    return this.heritageService.getHeritageBySlug(slug);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  async getHeritageById(@Param('id') id: string) {
    return this.heritageService.getHeritageById(id);
  }

  @Get()
  async getAllHeritage(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('name') name?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
  ) {
    return this.heritageService.getAllHeritage({
      status,
      type,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      name,
      sort,
      order: order?.toUpperCase() as 'ASC' | 'DESC',
    });
  }

  @Post('ai-sync/backfill')
  async backfillAiSync() {
    return this.heritageService.backfillAiSync();
  }

  @Post()
  async createHeritage(@Body() dto: CreateHeritageDto) {
    return this.heritageService.createHeritage(dto);
  }

  @Put(':id')
  async updateHeritage(@Param('id') id: string, @Body() dto: UpdateHeritageDto) {
    return this.heritageService.updateHeritage(id, dto);
  }

  @Delete(':id')
  async deleteHeritage(@Param('id') id: string) {
    return this.heritageService.deleteHeritage(id);
  }
}
