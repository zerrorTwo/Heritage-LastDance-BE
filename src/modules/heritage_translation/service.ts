import { Injectable, BadRequestException } from '@nestjs/common';
import { HeritageTranslationRepository } from './repository';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';

@Injectable()
export class HeritageTranslationService {
  constructor(private readonly translationRepo: HeritageTranslationRepository) {}

  async getTranslationById(id: string) {
    const translation = await this.translationRepo.findById(id);
    if (!translation) throw new BadRequestException('Translation not found!');
    return translation;
  }

  async getTranslationsByHeritageId(heritageId: string) {
    return this.translationRepo.findByHeritageId(heritageId);
  }

  async createTranslation(dto: CreateTranslationDto) {
    return this.translationRepo.create(dto);
  }

  async updateTranslation(id: string, dto: UpdateTranslationDto) {
    const translation = await this.translationRepo.findById(id);
    if (!translation) throw new BadRequestException('Translation not found!');
    await this.translationRepo.update(id, dto);
    return this.translationRepo.findById(id);
  }

  async deleteTranslation(id: string) {
    const translation = await this.translationRepo.findById(id);
    if (!translation) throw new BadRequestException('Translation not found!');
    await this.translationRepo.delete(id);
    return { message: 'Translation deleted successfully' };
  }
}
