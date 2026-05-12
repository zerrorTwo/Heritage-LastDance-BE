import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FavoriteRepository } from './repository';
import { HeritageRepository } from '../heritage/repository';
import { FavoriteItem } from './model';
import { FavoriteQueryDto } from './dto/favorite.dto';

@Injectable()
export class FavoriteService {
  constructor(
    private readonly favoriteRepo: FavoriteRepository,
    private readonly heritageRepo: HeritageRepository,
  ) {}

  async getAll(query: {
    page?: number;
    limit?: number;
    sort?: string;
    order?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const sort = query.sort || 'createdAt';
    const order = (query.order?.toUpperCase() as 'ASC' | 'DESC') || 'DESC';

    const { results, total } = await this.favoriteRepo.findAll({ page, limit, sort, order });
    const totalPages = Math.ceil(total / limit);

    return {
      items: results.map((f) => ({
        ...f,
        items: this.favoriteRepo.parseItems(f.items),
      })),
      pagination: { page, limit, totalPages, totalItems: total },
    };
  }

  async getFavoriteById(id: string) {
    const fav = await this.favoriteRepo.findById(id);
    if (!fav) throw new NotFoundException('Favorite not found');
    return { ...fav, items: this.favoriteRepo.parseItems(fav.items) };
  }

  async getByUserId(userId: string, queryDto: FavoriteQueryDto) {
    const page = Number(queryDto.page) || 1;
    const limit = Number(queryDto.limit) || 10;

    const fav = await this.favoriteRepo.findByUserId(userId);
    if (!fav) {
      return {
        items: [],
        pagination: { page, limit, totalItems: 0, totalPages: 0 },
      };
    }

    const allItems: FavoriteItem[] = this.favoriteRepo.parseItems(fav.items);
    const totalItems = allItems.length;
    const totalPages = Math.ceil(totalItems / limit);
    const skip = (page - 1) * limit;
    const paginatedItems = allItems.slice(skip, skip + limit);

    const heritageIds = paginatedItems
      .map((item) => item.heritageId)
      .filter(Boolean);

    const heritageMap = new Map<string, { id: string; title: string; slug: string; status: string }>();
    if (heritageIds.length > 0) {
      const heritages = await this.heritageRepo.findByIds(heritageIds);
      for (const h of heritages) {
        heritageMap.set(h.id, {
          id: h.id,
          title: h.title,
          slug: h.slug,
          status: h.status,
        });
      }
    }

    const heritageDetails = paginatedItems.map((item) =>
      heritageMap.get(item.heritageId) || null,
    );

    return {
      items: heritageDetails.filter(Boolean),
      pagination: { page, limit, totalItems, totalPages },
    };
  }

  async addToFavorites(userId: string, heritageId: string) {
    const heritage = await this.heritageRepo.findById(heritageId);
    if (!heritage) throw new NotFoundException('Heritage not found');

    const existingFav = await this.favoriteRepo.findByUserId(userId);

    if (!existingFav) {
      const newFav = await this.favoriteRepo.create(userId, [
        { heritageId, addedAt: new Date() },
      ]);
      return { ...newFav, items: this.favoriteRepo.parseItems(newFav.items) };
    }

    const currentItems: FavoriteItem[] = this.favoriteRepo.parseItems(existingFav.items);

    const isDuplicate = currentItems.some((item) => item.heritageId === heritageId);
    if (isDuplicate) {
      throw new BadRequestException('Heritage already exists in favorites');
    }

    const updatedItems: FavoriteItem[] = [
      ...currentItems,
      { heritageId, addedAt: new Date() },
    ];

    const updated = await this.favoriteRepo.update(existingFav.id, updatedItems);
    return { ...updated, items: this.favoriteRepo.parseItems(updated!.items) };
  }

  async deleteByHeritageId(userId: string, heritageId: string) {
    const heritage = await this.heritageRepo.findById(heritageId);
    if (!heritage) throw new NotFoundException('Heritage not found');

    const fav = await this.favoriteRepo.findByUserId(userId);
    if (!fav) throw new NotFoundException('Favorite list not found');

    const currentItems: FavoriteItem[] = this.favoriteRepo.parseItems(fav.items);
    const updatedItems = currentItems.filter((item) => item.heritageId !== heritageId);

    if (updatedItems.length === 0) {
      await this.favoriteRepo.delete(fav.id);
    } else {
      await this.favoriteRepo.update(fav.id, updatedItems);
    }

    return { message: 'Removed from favorites successfully' };
  }
}
