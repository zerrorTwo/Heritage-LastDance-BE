import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { HeritageMediaService } from './service';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';

@Controller('media')
export class HeritageMediaController {
  constructor(private readonly mediaService: HeritageMediaService) {}

  @Get(':id')
  async getMedia(@Param('id') id: string) {
    return this.mediaService.getMediaById(id);
  }

  @Get('heritage/:heritageId')
  async getMediaByHeritage(@Param('heritageId') heritageId: string) {
    return this.mediaService.getMediaByHeritageId(heritageId);
  }

  @Post()
  async createMedia(@Body() dto: CreateMediaDto) {
    return this.mediaService.createMedia(dto);
  }

  @Put(':id')
  async updateMedia(@Param('id') id: string, @Body() dto: UpdateMediaDto) {
    return this.mediaService.updateMedia(id, dto);
  }

  @Delete(':id')
  async deleteMedia(@Param('id') id: string) {
    return this.mediaService.deleteMedia(id);
  }
}
