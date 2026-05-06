import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './model';

@Injectable()
export class HeritageCategoryRepository {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  async findBySlug(slug: string): Promise<Category | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async findById(id: string): Promise<Category | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findAll(): Promise<Category[]> {
    return this.repo.find();
  }

  async create(data: Partial<Category>): Promise<Category> {
    return this.repo.save(data);
  }

  async update(id: string, data: Partial<Category>): Promise<void> {
    await this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
