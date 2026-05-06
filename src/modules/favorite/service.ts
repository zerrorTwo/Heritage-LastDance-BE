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

  /** Lấy tất cả favorite với phân trang (admin) */
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

  /** Lấy favorite theo ID */
  async getFavoriteById(id: string) {
    const fav = await this.favoriteRepo.findById(id);
    if (!fav) throw new NotFoundException('Favorite not found');
    return { ...fav, items: this.favoriteRepo.parseItems(fav.items) };
  }

  /** Lấy danh sách favorite của user với phân trang + thông tin heritage */
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

    // Lấy thông tin heritage cho từng item
    const heritageDetails = await Promise.all(
      paginatedItems.map(async (item) => {
        try {
          const heritage = await this.heritageRepo.findById(item.heritageId);
          return heritage
            ? { id: heritage.id, title: heritage.title, slug: heritage.slug, status: heritage.status }
            : null;
        } catch {
          return null;
        }
      }),
    );

    return {
      items: heritageDetails.filter(Boolean),
      pagination: { page, limit, totalItems, totalPages },
    };
  }

  /** Thêm heritage vào favorite */
  async addToFavorites(userId: string, heritageId: string) {
    // Kiểm tra heritage tồn tại
    const heritage = await this.heritageRepo.findById(heritageId);
    if (!heritage) throw new NotFoundException('Heritage not found');

    const existingFav = await this.favoriteRepo.findByUserId(userId);

    if (!existingFav) {
      // Tạo mới favorite list
      const newFav = await this.favoriteRepo.create(userId, [
        { heritageId, addedAt: new Date() },
      ]);
      return { ...newFav, items: this.favoriteRepo.parseItems(newFav.items) };
    }

    const currentItems: FavoriteItem[] = this.favoriteRepo.parseItems(existingFav.items);

    // Kiểm tra duplicate
    const isDuplicate = currentItems.some((item) => item.heritageId === heritageId);
    if (isDuplicate) {
      throw new BadRequestException('Heritage already exists in favorites');
    }

    // Thêm vào danh sách
    const updatedItems: FavoriteItem[] = [
      ...currentItems,
      { heritageId, addedAt: new Date() },
    ];

    const updated = await this.favoriteRepo.update(existingFav.id, updatedItems);
    return { ...updated, items: this.favoriteRepo.parseItems(updated!.items) };
  }

  /** Xóa heritage khỏi favorite */
  async deleteByHeritageId(userId: string, heritageId: string) {
    // Kiểm tra heritage tồn tại
    const heritage = await this.heritageRepo.findById(heritageId);
    if (!heritage) throw new NotFoundException('Heritage not found');

    const fav = await this.favoriteRepo.findByUserId(userId);
    if (!fav) throw new NotFoundException('Favorite list not found');

    const currentItems: FavoriteItem[] = this.favoriteRepo.parseItems(fav.items);
    const updatedItems = currentItems.filter((item) => item.heritageId !== heritageId);

    if (updatedItems.length === 0) {
      // Xóa toàn bộ favorite document nếu không còn item nào
      await this.favoriteRepo.delete(fav.id);
    } else {
      await this.favoriteRepo.update(fav.id, updatedItems);
    }

    return { message: 'Removed from favorites successfully' };
  }
}
