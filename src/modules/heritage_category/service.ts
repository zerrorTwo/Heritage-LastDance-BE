import { Injectable, BadRequestException } from '@nestjs/common';
import { HeritageCategoryRepository } from './repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class HeritageCategoryService {
  constructor(private readonly categoryRepo: HeritageCategoryRepository) {}

  async getCategoryBySlug(slug: string) {
    const category = await this.categoryRepo.findBySlug(slug);
    if (!category) throw new BadRequestException('Category not found!');
    return category;
  }

  async getCategoryById(id: string) {
    const category = await this.categoryRepo.findById(id);
    if (!category) throw new BadRequestException('Category not found!');
    return category;
  }

  async getAllCategories() {
    return this.categoryRepo.findAll();
  }

  async createCategory(dto: CreateCategoryDto) {
    return this.categoryRepo.create(dto);
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoryRepo.findById(id);
    if (!category) throw new BadRequestException('Category not found!');
    await this.categoryRepo.update(id, dto);
    return this.categoryRepo.findById(id);
  }

  async deleteCategory(id: string) {
    const category = await this.categoryRepo.findById(id);
    if (!category) throw new BadRequestException('Category not found!');
    await this.categoryRepo.delete(id);
    return { message: 'Category deleted successfully' };
  }
}
