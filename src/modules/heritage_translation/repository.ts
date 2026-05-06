import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HeritageTranslation } from './model';

@Injectable()
export class HeritageTranslationRepository {
  constructor(
    @InjectRepository(HeritageTranslation)
    private readonly repo: Repository<HeritageTranslation>,
  ) {}

  async findById(id: string): Promise<HeritageTranslation | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByHeritageId(heritageId: string): Promise<HeritageTranslation[]> {
    return this.repo.find({ where: { heritageId } });
  }

  async create(data: Partial<HeritageTranslation>): Promise<HeritageTranslation> {
    return this.repo.save(data);
  }

  async update(id: string, data: Partial<HeritageTranslation>): Promise<void> {
    await this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
