import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { McpTokenModel } from './model';

@Injectable()
export class McpTokenRepository {
  constructor(
    @InjectRepository(McpTokenModel)
    private readonly repo: Repository<McpTokenModel>,
  ) {}

  async findByToken(token: string): Promise<McpTokenModel | null> {
    return this.repo.findOne({ where: { token }, relations: ['user'] });
  }

  async findByUserId(userId: string): Promise<McpTokenModel[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(userId: string, token: string, name: string): Promise<McpTokenModel> {
    const entity = this.repo.create({ userId, token, name });
    return this.repo.save(entity);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.repo.update(id, { lastUsedAt: new Date() });
  }
}
