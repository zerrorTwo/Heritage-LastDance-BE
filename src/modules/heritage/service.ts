import { Inject, Injectable, BadRequestException, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { HeritageRepository, HeritageFilter } from './repository';
import { CreateHeritageDto } from './dto/create-heritage.dto';
import { UpdateHeritageDto } from './dto/update-heritage.dto';
import { HeritageItem } from './model';
import { RagService, HeritageSyncInput } from '../rag/service';

/** HeritageItem possibly carrying embedded locations (from repo attachEmbeddedData). */
type HeritageWithLocations = HeritageItem & {
  locations?: Array<{ address?: string | null; latitude?: number | null; longitude?: number | null }>;
};

@Injectable()
export class HeritageService {
  private readonly logger = new Logger(HeritageService.name);

  constructor(
    private readonly heritageRepo: HeritageRepository,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly ragService: RagService,
  ) {}

  /** Map a heritage item (+ first location, if any) to the AI sync payload. */
  private toSyncInput(item: HeritageWithLocations): HeritageSyncInput {
    const loc = item.locations?.[0];
    return {
      id: item.id,
      slug: item.slug,
      title: item.title,
      status: item.status,
      summary: item.summary,
      content: item.content,
      type: item.type,
      history: item.history,
      architecture: item.architecture,
      culturalSignificance: item.culturalSignificance,
      constructionPeriod: item.constructionPeriod,
      founder: item.founder,
      legends: item.legends,
      alternativeNames: item.alternativeNames,
      sourceUrl: item.sourceUrl,
      address: loc?.address ?? null,
      latitude: loc?.latitude != null ? Number(loc.latitude) : null,
      longitude: loc?.longitude != null ? Number(loc.longitude) : null,
    };
  }

  /**
   * Push a heritage item to the AI knowledge base when published, or remove it
   * otherwise. Fire-and-forget + fail-soft: never blocks or breaks CRUD.
   */
  private mirrorToAi(item: HeritageWithLocations | null | undefined) {
    if (!item) return;
    if (item.status === 'published') {
      void this.ragService.syncHeritage(this.toSyncInput(item));
    } else {
      void this.ragService.removeHeritage(item.slug);
    }
  }

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
    this.mirrorToAi(result);
    return result;
  }

  async updateHeritage(id: string, dto: UpdateHeritageDto) {
    const heritage = await this.heritageRepo.findById(id);
    if (!heritage) throw new BadRequestException('Heritage item not found!');
    const oldSlug = heritage.slug;
    const updateData = {
      ...dto,
      ...(dto.title && !dto.slug ? { slug: await this.buildUniqueSlug(dto.title, id) } : {}),
    };
    await this.heritageRepo.update(id, updateData);
    await this.cacheManager.del(`heritage:id:${id}`);
    await this.cacheManager.del(`heritage:slug:${heritage.slug}`);
    await this.cacheManager.del('heritage:list');
    const updated = await this.heritageRepo.findById(id);
    // If the slug changed, drop the stale AI page before mirroring the new one.
    if (updated && updated.slug !== oldSlug) void this.ragService.removeHeritage(oldSlug);
    this.mirrorToAi(updated);
    return updated;
  }

  async deleteHeritage(id: string) {
    const heritage = await this.heritageRepo.findById(id);
    if (!heritage) throw new BadRequestException('Heritage item not found!');
    await this.cacheManager.del(`heritage:id:${id}`);
    await this.cacheManager.del(`heritage:slug:${heritage.slug}`);
    await this.cacheManager.del('heritage:list');
    await this.heritageRepo.delete(id);
    void this.ragService.removeHeritage(heritage.slug);
    return { message: 'Heritage item deleted successfully' };
  }

  /**
   * Backfill: push every published heritage item to the AI knowledge base.
   * One-off sync to seed the chatbot with existing CMS data.
   */
  async backfillAiSync() {
    const published = await this.heritageRepo.findAllPublished();
    this.logger.log(`AI backfill: syncing ${published.length} published heritage items`);
    let ok = 0;
    for (const item of published) {
      await this.ragService.syncHeritage(this.toSyncInput(item));
      ok += 1;
    }
    return { published: published.length, synced: ok };
  }
}
