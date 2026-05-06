import { Injectable, BadRequestException } from '@nestjs/common';
import { HeritageRelationRepository } from './repository';
import { CreateRelationDto } from './dto/create-relation.dto';
import { UpdateRelationDto } from './dto/update-relation.dto';

@Injectable()
export class HeritageRelationService {
  constructor(private readonly relationRepo: HeritageRelationRepository) {}

  async getRelationById(id: string) {
    const relation = await this.relationRepo.findById(id);
    if (!relation) throw new BadRequestException('Relation not found!');
    return relation;
  }

  async getRelationsByFromId(fromId: string) {
    return this.relationRepo.findByFromId(fromId);
  }

  async getRelationsByToId(toId: string) {
    return this.relationRepo.findByToId(toId);
  }

  async createRelation(dto: CreateRelationDto) {
    return this.relationRepo.create(dto);
  }

  async updateRelation(id: string, dto: UpdateRelationDto) {
    const relation = await this.relationRepo.findById(id);
    if (!relation) throw new BadRequestException('Relation not found!');
    await this.relationRepo.update(id, dto);
    return this.relationRepo.findById(id);
  }

  async deleteRelation(id: string) {
    const relation = await this.relationRepo.findById(id);
    if (!relation) throw new BadRequestException('Relation not found!');
    await this.relationRepo.delete(id);
    return { message: 'Relation deleted successfully' };
  }
}
