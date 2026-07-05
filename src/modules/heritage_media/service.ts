import { Injectable, BadRequestException } from '@nestjs/common';
import { HeritageMediaRepository } from './repository';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';

@Injectable()
export class HeritageMediaService {
  constructor(private readonly mediaRepo: HeritageMediaRepository) {}

  async getMediaById(id: string) {
    const media = await this.mediaRepo.findById(id);
    if (!media) throw new BadRequestException('Media not found!');
    return media;
  }

  async getMediaByHeritageId(heritageId: string) {
    return this.mediaRepo.findByHeritageId(heritageId);
  }

  async createMedia(dto: CreateMediaDto) {
    return this.mediaRepo.create(dto);
  }

  async updateMedia(id: string, dto: UpdateMediaDto) {
    const media = await this.mediaRepo.findById(id);
    if (!media) throw new BadRequestException('Media not found!');
    await this.mediaRepo.update(id, dto);
    return this.mediaRepo.findById(id);
  }

  async deleteMedia(id: string) {
    const media = await this.mediaRepo.findById(id);
    if (!media) throw new BadRequestException('Media not found!');
    await this.mediaRepo.delete(id);
    return { message: 'Media deleted successfully' };
  }
}
