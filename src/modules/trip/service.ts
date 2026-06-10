import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TripRepository, TripMomentRepository } from './repository';
import { CreateTripDto, UpdateTripVisibilityDto } from './dto/trip.dto';
import { GamificationService } from '../gamification/service';
import { TripModel } from './model';

// Đi bộ tham quan ~3.5 MET; kcal = MET * kg * giờ
const MET_WALK = 3.5;
// XP: thưởng cơ bản + theo km + theo số di tích ghé
const XP_BASE = 20;
const XP_PER_KM = 5;
const XP_PER_HERITAGE = 10;

@Injectable()
export class TripService {
  constructor(
    private readonly tripRepo: TripRepository,
    private readonly momentRepo: TripMomentRepository,
    private readonly gamification: GamificationService,
  ) {}

  private parse<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private hydrate(trip: TripModel, moments: any[] = []) {
    return {
      ...trip,
      points: this.parse(trip.points, [] as any[]),
      heritageIds: this.parse(trip.heritageIds, [] as string[]),
      moments,
    };
  }

  async createTrip(dto: CreateTripDto) {
    if (!dto.userId) throw new BadRequestException('Thiếu người dùng');
    const points = Array.isArray(dto.points) ? dto.points : [];
    const heritageIds = Array.isArray(dto.heritageIds) ? dto.heritageIds : [];

    // kcal ước tính nếu có cân nặng
    let kcal: number | null = null;
    const weight = Number(dto.weightKg);
    if (weight && weight > 0 && dto.durationSec > 0) {
      kcal = Math.round((MET_WALK * weight * dto.durationSec) / 3600);
    }

    // XP
    const km = (dto.distanceM || 0) / 1000;
    const xp = Math.round(
      XP_BASE + km * XP_PER_KM + heritageIds.length * XP_PER_HERITAGE,
    );

    const trip = await this.tripRepo.create({
      userId: dto.userId,
      displayName: dto.displayName ?? null,
      avatarUrl: dto.avatarUrl ?? null,
      title: dto.title?.trim() || this.autoTitle(heritageIds.length),
      startedAt: dto.startedAt ? new Date(dto.startedAt) : null,
      endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
      durationSec: dto.durationSec || 0,
      distanceM: dto.distanceM || 0,
      kcal,
      points: JSON.stringify(points),
      coverPhoto: dto.coverPhoto ?? null,
      heritageIds: JSON.stringify(heritageIds),
      heritageCount: heritageIds.length,
      visibility: dto.visibility === 'public' ? 'public' : 'private',
      status: 'active',
      xpAwarded: xp,
    });

    // Khoảnh khắc dọc đường
    const moments = [];
    for (const m of dto.moments ?? []) {
      if (!m) continue;
      moments.push(
        await this.momentRepo.create({
          tripId: trip.id,
          lat: m.lat ?? null,
          lng: m.lng ?? null,
          photoUrl: m.photoUrl ?? null,
          note: m.note ?? null,
        }),
      );
    }

    const progress = await this.gamification.awardXp(dto.userId, xp);

    return { trip: this.hydrate(trip, moments), progress };
  }

  private autoTitle(heritageCount: number): string {
    return heritageCount > 0
      ? `Hành trình qua ${heritageCount} di sản`
      : 'Hành trình khám phá';
  }

  async getUserTrips(userId: string) {
    const trips = await this.tripRepo.findByUser(userId);
    return trips.map((t) => this.hydrate(t));
  }

  async getCommunity(limit = 30) {
    const trips = await this.tripRepo.findCommunity(limit);
    return trips.map((t) => this.hydrate(t));
  }

  async getTripById(id: string) {
    const trip = await this.tripRepo.findById(id);
    if (!trip) throw new NotFoundException('Hành trình không tồn tại');
    const moments = await this.momentRepo.findByTrip(id);
    return this.hydrate(trip, moments);
  }

  async setVisibility(id: string, dto: UpdateTripVisibilityDto) {
    const trip = await this.tripRepo.findById(id);
    if (!trip) throw new NotFoundException('Hành trình không tồn tại');
    if (trip.userId !== dto.userId)
      throw new ForbiddenException('Không có quyền');
    const updated = await this.tripRepo.update(id, {
      visibility: dto.visibility === 'public' ? 'public' : 'private',
    });
    return this.hydrate(updated!);
  }

  async deleteTrip(id: string, userId: string) {
    const trip = await this.tripRepo.findById(id);
    if (!trip) throw new NotFoundException('Hành trình không tồn tại');
    if (trip.userId !== userId) throw new ForbiddenException('Không có quyền');
    await this.momentRepo.deleteByTrip(id);
    await this.tripRepo.delete(id);
    return { success: true };
  }
}
