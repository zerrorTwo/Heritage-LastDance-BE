import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HeritageMedia } from './model';

@Injectable()
export class HeritageMediaRepository {
  constructor(
    @InjectRepository(HeritageMedia)
    private readonly repo: Repository<HeritageMedia>,
  ) {}

  async findById(id: string): Promise<HeritageMedia | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByHeritageId(heritageId: string): Promise<HeritageMedia[]> {
    return this.repo.find({ where: { heritageId } });
  }

  async create(data: Partial<HeritageMedia>): Promise<HeritageMedia> {
    return this.repo.save(data);
  }

  async update(id: string, data: Partial<HeritageMedia>): Promise<void> {
    await this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
