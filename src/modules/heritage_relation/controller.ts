import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { HeritageRelationService } from './service';
import { CreateRelationDto } from './dto/create-relation.dto';
import { UpdateRelationDto } from './dto/update-relation.dto';

@Controller('relation')
export class HeritageRelationController {
  constructor(private readonly relationService: HeritageRelationService) {}

  @Get(':id')
  async getRelation(@Param('id') id: string) {
    return this.relationService.getRelationById(id);
  }

  @Get('from/:fromId')
  async getRelationsByFromId(@Param('fromId') fromId: string) {
    return this.relationService.getRelationsByFromId(fromId);
  }

  @Get('to/:toId')
  async getRelationsByToId(@Param('toId') toId: string) {
    return this.relationService.getRelationsByToId(toId);
  }

  @Post()
  async createRelation(@Body() dto: CreateRelationDto) {
    return this.relationService.createRelation(dto);
  }

  @Put(':id')
  async updateRelation(@Param('id') id: string, @Body() dto: UpdateRelationDto) {
    return this.relationService.updateRelation(id, dto);
  }

  @Delete(':id')
  async deleteRelation(@Param('id') id: string) {
    return this.relationService.deleteRelation(id);
  }
}
