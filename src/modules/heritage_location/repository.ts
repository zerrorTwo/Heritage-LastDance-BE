import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HeritageLocation } from './model';

@Injectable()
export class HeritageLocationRepository {
  constructor(
    @InjectRepository(HeritageLocation)
    private readonly repo: Repository<HeritageLocation>,
  ) {}

  async findById(id: string): Promise<HeritageLocation | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByHeritageId(heritageId: string): Promise<HeritageLocation[]> {
    return this.repo.find({ where: { heritageId } });
  }

  async create(data: Partial<HeritageLocation>): Promise<HeritageLocation> {
    return this.repo.save(data);
  }

  async update(id: string, data: Partial<HeritageLocation>): Promise<void> {
    await this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
