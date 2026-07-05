import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HeritageRelation } from './model';

@Injectable()
export class HeritageRelationRepository {
  constructor(
    @InjectRepository(HeritageRelation)
    private readonly repo: Repository<HeritageRelation>,
  ) {}

  async findById(id: string): Promise<HeritageRelation | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByFromId(fromId: string): Promise<HeritageRelation[]> {
    return this.repo.find({ where: { fromId } });
  }

  async findByToId(toId: string): Promise<HeritageRelation[]> {
    return this.repo.find({ where: { toId } });
  }

  async create(data: Partial<HeritageRelation>): Promise<HeritageRelation> {
    return this.repo.save(data);
  }

  async update(id: string, data: Partial<HeritageRelation>): Promise<void> {
    await this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
