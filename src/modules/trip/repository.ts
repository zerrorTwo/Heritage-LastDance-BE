import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripModel, TripMomentModel } from './model';

@Injectable()
export class TripRepository {
  constructor(
    @InjectRepository(TripModel)
    private readonly repo: Repository<TripModel>,
  ) {}

  create(data: Partial<TripModel>): Promise<TripModel> {
    return this.repo.save(this.repo.create(data));
  }

  findById(id: string): Promise<TripModel | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByUser(userId: string): Promise<TripModel[]> {
    return this.repo.find({
      where: { userId, status: 'active' },
      order: { createdAt: 'DESC' },
    });
  }

  findCommunity(limit: number): Promise<TripModel[]> {
    return this.repo.find({
      where: { visibility: 'public', status: 'active' },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async update(id: string, data: Partial<TripModel>): Promise<TripModel | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}

@Injectable()
export class TripMomentRepository {
  constructor(
    @InjectRepository(TripMomentModel)
    private readonly repo: Repository<TripMomentModel>,
  ) {}

  create(data: Partial<TripMomentModel>): Promise<TripMomentModel> {
    return this.repo.save(this.repo.create(data));
  }

  findByTrip(tripId: string): Promise<TripMomentModel[]> {
    return this.repo.find({ where: { tripId }, order: { createdAt: 'ASC' } });
  }

  async deleteByTrip(tripId: string): Promise<void> {
    await this.repo.delete({ tripId });
  }
}
