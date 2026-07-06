import { Injectable, NotFoundException } from '@nestjs/common';
import { DiscussRepository } from './repository';
import { CreateDiscussDto } from './dto/discuss.dto';

@Injectable()
export class DiscussService {
  constructor(private readonly discussRepo: DiscussRepository) {}

  /** Tạo thảo luận mới (hỗ trợ nested set) */
  async createNew(dto: CreateDiscussDto) {
    const discuss = await this.discussRepo.createNew({
      heritageId: dto.heritageId,
      parentId: dto.parentId ?? null,
      userId: dto.userId,
      content: dto.content,
    });

    if (!discuss) {
      throw new Error('Failed to create Discuss');
    }

    return discuss;
  }

  /** Lấy danh sách thảo luận theo parentId + heritageId */
  async getByParentId(parentId: string | undefined, heritageId: string) {
    const items = await this.discussRepo.getByParentId(
      parentId ?? null,
      heritageId,
    );

    if (!items) {
      throw new NotFoundException('Discusses not found');
    }

    return items;
  }

  /** Xóa thảo luận và các con của nó (nested set delete) */
  async deleteNestedById(heritageId: string, discussId: string) {
    const existing = await this.discussRepo.findById(discussId);
    if (!existing) {
      throw new NotFoundException('Discuss not found');
    }

    return this.discussRepo.deleteNested(heritageId, discussId);
  }
}
