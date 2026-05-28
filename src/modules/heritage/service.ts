import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { HeritageRepository, HeritageFilter } from './repository';
import { CreateHeritageDto } from './dto/create-heritage.dto';
import { UpdateHeritageDto } from './dto/update-heritage.dto';

@Injectable()
export class HeritageService {
  constructor(
    private readonly heritageRepo: HeritageRepository,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private slugify(value: string) {
    const vietnameseCharMap: Record<string, string> = {
      a: 'áàảãạăắằẳẵặâấầẩẫậ',
      d: 'đ',
      e: 'éèẻẽẹêếềểễệ',
      i: 'íìỉĩị',
      o: 'óòỏõọôốồổỗộơớờởỡợ',
      u: 'úùủũụưứừửữự',
      y: 'ýỳỷỹỵ',
    };

    let slug = value.toLowerCase().trim();
    for (const [ascii, chars] of Object.entries(vietnameseCharMap)) {
      slug = slug.replace(new RegExp(`[${chars}]`, 'g'), ascii);
    }

    return slug
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async buildUniqueSlug(title: string, currentId?: string) {
    const baseSlug = this.slugify(title) || 'heritage';
    let slug = baseSlug;
    let suffix = 1;

    while (true) {
      const existing = await this.heritageRepo.findBySlug(slug);
      if (!existing || existing.id === currentId) return slug;
      slug = `${baseSlug}-${suffix++}`;
    }
  }

  async getHeritageBySlug(slug: string) {
    const cacheKey = `heritage:slug:${slug}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const heritage = await this.heritageRepo.findBySlug(slug);
    if (!heritage) throw new BadRequestException('Heritage item not found!');
    await this.cacheManager.set(cacheKey, heritage, 60 * 1000);
    return heritage;
  }

  async getHeritageById(id: string) {
    const cacheKey = `heritage:id:${id}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const heritage = await this.heritageRepo.findById(id);
    if (!heritage) throw new BadRequestException('Heritage item not found!');
    await this.cacheManager.set(cacheKey, heritage, 60 * 1000);
    return heritage;
  }

  async getAllHeritage(filter?: HeritageFilter) {
    return this.heritageRepo.findAll(filter);
  }

  async createHeritage(dto: CreateHeritageDto) {
    const result = await this.heritageRepo.create({
      ...dto,
      slug: dto.slug || (await this.buildUniqueSlug(dto.title)),
    });
    await this.cacheManager.del('heritage:list');
    return result;
  }

  async updateHeritage(id: string, dto: UpdateHeritageDto) {
    const heritage = await this.heritageRepo.findById(id);
    if (!heritage) throw new BadRequestException('Heritage item not found!');
    const updateData = {
      ...dto,
      ...(dto.title && !dto.slug ? { slug: await this.buildUniqueSlug(dto.title, id) } : {}),
    };
    await this.heritageRepo.update(id, updateData);
    await this.cacheManager.del(`heritage:id:${id}`);
    await this.cacheManager.del(`heritage:slug:${heritage.slug}`);
    await this.cacheManager.del('heritage:list');
    return this.heritageRepo.findById(id);
  }

  async deleteHeritage(id: string) {
    const heritage = await this.heritageRepo.findById(id);
    if (!heritage) throw new BadRequestException('Heritage item not found!');
    await this.cacheManager.del(`heritage:id:${id}`);
    await this.cacheManager.del(`heritage:slug:${heritage.slug}`);
    await this.cacheManager.del('heritage:list');
    await this.heritageRepo.delete(id);
    return { message: 'Heritage item deleted successfully' };
  }
}
