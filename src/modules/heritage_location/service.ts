import { Injectable, BadRequestException } from '@nestjs/common';
import { HeritageLocationRepository } from './repository';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class HeritageLocationService {
  constructor(private readonly locationRepo: HeritageLocationRepository) {}

  async getLocationById(id: string) {
    const location = await this.locationRepo.findById(id);
    if (!location) throw new BadRequestException('Location not found!');
    return location;
  }

  async getLocationsByHeritageId(heritageId: string) {
    return this.locationRepo.findByHeritageId(heritageId);
  }

  async createLocation(dto: CreateLocationDto) {
    return this.locationRepo.create(dto);
  }

  async updateLocation(id: string, dto: UpdateLocationDto) {
    const location = await this.locationRepo.findById(id);
    if (!location) throw new BadRequestException('Location not found!');
    await this.locationRepo.update(id, dto);
    return this.locationRepo.findById(id);
  }

  async deleteLocation(id: string) {
    const location = await this.locationRepo.findById(id);
    if (!location) throw new BadRequestException('Location not found!');
    await this.locationRepo.delete(id);
    return { message: 'Location deleted successfully' };
  }
}
