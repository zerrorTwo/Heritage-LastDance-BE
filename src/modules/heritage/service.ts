import { Injectable, BadRequestException } from '@nestjs/common';
import { HeritageRepository } from './repository';
import { CreateHeritageDto } from './dto/create-heritage.dto';
import { UpdateHeritageDto } from './dto/update-heritage.dto';

@Injectable()
export class HeritageService {
  constructor(private readonly heritageRepo: HeritageRepository) {}

  async getHeritageBySlug(slug: string) {
    const heritage = await this.heritageRepo.findBySlug(slug);
    if (!heritage) throw new BadRequestException('Heritage item not found!');
    return heritage;
  }

  async getHeritageById(id: string) {
    const heritage = await this.heritageRepo.findById(id);
    if (!heritage) throw new BadRequestException('Heritage item not found!');
    return heritage;
  }

  async getAllHeritage(filter?: { status?: string; type?: string }) {
    return this.heritageRepo.findAll(filter);
  }

  async createHeritage(dto: CreateHeritageDto) {
    return this.heritageRepo.create(dto);
  }

  async updateHeritage(id: string, dto: UpdateHeritageDto) {
    const heritage = await this.heritageRepo.findById(id);
    if (!heritage) throw new BadRequestException('Heritage item not found!');
    await this.heritageRepo.update(id, dto);
    return this.heritageRepo.findById(id);
  }

  async deleteHeritage(id: string) {
    const heritage = await this.heritageRepo.findById(id);
    if (!heritage) throw new BadRequestException('Heritage item not found!');
    await this.heritageRepo.delete(id);
    return { message: 'Heritage item deleted successfully' };
  }
}
