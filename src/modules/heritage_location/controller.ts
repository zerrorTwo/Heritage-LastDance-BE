import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { HeritageLocationService } from './service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Controller('location')
export class HeritageLocationController {
  constructor(private readonly locationService: HeritageLocationService) {}

  @Get(':id')
  async getLocation(@Param('id') id: string) {
    return this.locationService.getLocationById(id);
  }

  @Get('heritage/:heritageId')
  async getLocationsByHeritage(@Param('heritageId') heritageId: string) {
    return this.locationService.getLocationsByHeritageId(heritageId);
  }

  @Post()
  async createLocation(@Body() dto: CreateLocationDto) {
    return this.locationService.createLocation(dto);
  }

  @Put(':id')
  async updateLocation(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.locationService.updateLocation(id, dto);
  }

  @Delete(':id')
  async deleteLocation(@Param('id') id: string) {
    return this.locationService.deleteLocation(id);
  }
}
