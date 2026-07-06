import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { HeritageTranslationService } from './service';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';

@Controller('translation')
export class HeritageTranslationController {
  constructor(private readonly translationService: HeritageTranslationService) {}

  @Get(':id')
  async getTranslation(@Param('id') id: string) {
    return this.translationService.getTranslationById(id);
  }

  @Get('heritage/:heritageId')
  async getTranslationsByHeritage(@Param('heritageId') heritageId: string) {
    return this.translationService.getTranslationsByHeritageId(heritageId);
  }

  @Post()
  async createTranslation(@Body() dto: CreateTranslationDto) {
    return this.translationService.createTranslation(dto);
  }

  @Put(':id')
  async updateTranslation(@Param('id') id: string, @Body() dto: UpdateTranslationDto) {
    return this.translationService.updateTranslation(id, dto);
  }

  @Delete(':id')
  async deleteTranslation(@Param('id') id: string) {
    return this.translationService.deleteTranslation(id);
  }
}
