import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { BannerRepository } from './repository';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { BannerModel } from './model';

@Injectable()
export class BannerService {
  constructor(private readonly bannerRepo: BannerRepository) {}

  async findAll(activeOnly: boolean = false): Promise<BannerModel[]> {
    return this.bannerRepo.findAll(activeOnly);
  }

  async findById(id: string): Promise<BannerModel> {
    const banner = await this.bannerRepo.findById(id);
    if (!banner) throw new NotFoundException('Banner not found');
    return banner;
  }

  async findByType(type: string, activeOnly: boolean = false): Promise<BannerModel[]> {
    return this.bannerRepo.findByType(type, activeOnly);
  }

  async create(dto: CreateBannerDto): Promise<BannerModel> {
    const data = {
      ...dto,
      startAt: dto.startAt ? new Date(dto.startAt) : null,
      endAt: dto.endAt ? new Date(dto.endAt) : null,
    };
    return this.bannerRepo.create(data);
  }

  async update(id: string, dto: UpdateBannerDto): Promise<BannerModel> {
    const banner = await this.findById(id);

    if (dto.type !== undefined) banner.type = dto.type;
    if (dto.title !== undefined) banner.title = dto.title;
    if (dto.description !== undefined) banner.description = dto.description;
    if (dto.imageUrl !== undefined) banner.imageUrl = dto.imageUrl;
    if (dto.mobileImageUrl !== undefined) banner.mobileImageUrl = dto.mobileImageUrl;
    if (dto.linkUrl !== undefined) banner.linkUrl = dto.linkUrl;
    if (dto.clickAction !== undefined) banner.clickAction = dto.clickAction;
    if (dto.position !== undefined) banner.position = dto.position;
    if (dto.priority !== undefined) banner.priority = dto.priority;
    if (dto.startAt !== undefined) banner.startAt = dto.startAt ? new Date(dto.startAt) : null;
    if (dto.endAt !== undefined) banner.endAt = dto.endAt ? new Date(dto.endAt) : null;
    if (dto.isActive !== undefined) banner.isActive = dto.isActive;

    await this.bannerRepo.update(banner);
    return banner;
  }

  async delete(id: string): Promise<void> {
    const banner = await this.findById(id);
    await this.bannerRepo.delete(id);
  }
}
