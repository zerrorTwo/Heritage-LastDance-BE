import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripRepository, TripMomentRepository } from './repository';
import { CreateTripDto, UpdateTripVisibilityDto } from './dto/trip.dto';
import { GamificationService } from '../gamification/service';
import { TripModel } from './model';
import { HeritageLocation } from '../heritage_location/model';
import { HeritageItem } from '../heritage/model';
import { CheckInModel } from '../gamification/check-in.model';
import { getAllGeoNodes } from '../graph/dataset.helpers';

// Đi bộ tham quan ~3.5 MET; kcal = MET * kg * giờ
const MET_WALK = 3.5;
// XP: thưởng cơ bản + theo km + theo số di tích ghé
const XP_BASE = 20;
const XP_PER_KM = 5;
const XP_PER_HERITAGE = 10;
// Bonus khi "trải nghiệm lại" một hành trình (đi được >= 60% quãng đường gốc)
const XP_FOLLOW_BONUS = 30;
// Một di tích được coi là "trên tuyến" nếu cách lộ trình <= bán kính này
const MATCH_RADIUS_M = 500;

export interface TripHeritage {
  id: string;
  name: string;
  slug: string | null;
  lat: number;
  lng: number;
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

@Injectable()
export class TripService {
  constructor(
    private readonly tripRepo: TripRepository,
    private readonly momentRepo: TripMomentRepository,
    private readonly gamification: GamificationService,
    @InjectRepository(HeritageLocation)
    private readonly locationRepo: Repository<HeritageLocation>,
    @InjectRepository(HeritageItem)
    private readonly heritageRepo: Repository<HeritageItem>,
    @InjectRepository(CheckInModel)
    private readonly checkInRepo: Repository<CheckInModel>,
  ) {}

  private parse<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private hydrate(trip: TripModel, extra: Record<string, any> = {}) {
    return {
      ...trip,
      points: this.parse(trip.points, [] as any[]),
      heritageIds: this.parse(trip.heritageIds, [] as string[]),
      heritages: this.parse(trip.heritageNames, [] as TripHeritage[]),
      ...extra,
    };
  }

  /**
   * Auto-match: tìm các di tích/địa danh lịch sử nằm trong MATCH_RADIUS_M
   * quanh lộ trình. Nguồn: dataset graph (demo Nhà Trần) + HeritageLocation (DB).
   */
  private async detectHeritages(
    points: Array<{ lat: number; lng: number }>,
  ): Promise<TripHeritage[]> {
    const pts = (points || []).filter(
      (p) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng)),
    );
    if (pts.length === 0) return [];

    // Bounding box lộ trình + đệm ~600m để lọc thô ứng viên
    const PAD = 0.006;
    const lats = pts.map((p) => Number(p.lat));
    const lngs = pts.map((p) => Number(p.lng));
    const minLat = Math.min(...lats) - PAD;
    const maxLat = Math.max(...lats) + PAD;
    const minLng = Math.min(...lngs) - PAD;
    const maxLng = Math.max(...lngs) + PAD;

    type Candidate = { id: string; name: string; slug: string | null; lat: number; lng: number };
    const candidates: Candidate[] = [];
    const graphNodeIds = new Set<string>();

    // 1) Node lịch sử trong dataset graph (slug = curated heritageSlug nếu có)
    for (const n of getAllGeoNodes()) {
      if (n.lat >= minLat && n.lat <= maxLat && n.lng >= minLng && n.lng <= maxLng) {
        graphNodeIds.add(n.id);
        candidates.push({ id: n.id, name: n.name, slug: n.heritageSlug ?? null, lat: n.lat, lng: n.lng });
      }
    }

    // 2) Di tích thật trong DB (HeritageLocation -> tên/slug từ HeritageItem)
    const locs = await this.locationRepo
      .createQueryBuilder('l')
      .where('l.latitude BETWEEN :minLat AND :maxLat', { minLat, maxLat })
      .andWhere('l.longitude BETWEEN :minLng AND :maxLng', { minLng, maxLng })
      .getMany();
    if (locs.length) {
      const ids = [...new Set(locs.map((l) => l.heritageId))];
      const items = await this.heritageRepo
        .createQueryBuilder('h')
        .where('h.id IN (:...ids)', { ids })
        .getMany();
      const byId = new Map(items.map((h) => [h.id, h]));
      for (const l of locs) {
        if (l.latitude == null || l.longitude == null) continue;
        const h = byId.get(l.heritageId);
        candidates.push({
          id: l.heritageId,
          name: h?.title || 'Di tích',
          slug: h?.slug || null,
          lat: Number(l.latitude),
          lng: Number(l.longitude),
        });
      }
    }

    // 3) Giữ ứng viên có khoảng cách min tới lộ trình <= bán kính
    const seen = new Set<string>();
    const matched: TripHeritage[] = [];
    for (const c of candidates) {
      if (seen.has(c.id)) continue;
      const near = pts.some(
        (p) => haversineM(Number(p.lat), Number(p.lng), c.lat, c.lng) <= MATCH_RADIUS_M,
      );
      if (near) {
        seen.add(c.id);
        matched.push({ id: c.id, name: c.name, slug: c.slug, lat: c.lat, lng: c.lng });
      }
    }

    // 4) Resolve id heritage thật cho node graph:
    //    - có curated slug  -> tra id theo slug (tất định)
    //    - chưa có slug      -> dò trang heritage trùng tên (fuzzy, fallback an toàn)
    for (const m of matched) {
      if (!graphNodeIds.has(m.id)) continue; // ứng viên từ DB đã có id+slug thật
      if (m.slug) {
        const real = await this.resolveHeritageBySlug(m.slug);
        if (real) m.id = real.id; // đổi node-id -> id heritage thật để dedup/khớp /heritage/:slug
        continue;
      }
      const resolved = await this.resolveHeritageByName(m.name);
      if (resolved) {
        m.slug = resolved.slug;
        m.id = resolved.id;
      }
    }

    // 5) Dedup theo slug (gộp node graph + heritage thật cùng địa điểm), ưu tiên bản có slug
    const bySlug = new Map<string, TripHeritage>();
    const result: TripHeritage[] = [];
    for (const m of matched) {
      if (m.slug) {
        if (!bySlug.has(m.slug)) {
          bySlug.set(m.slug, m);
          result.push(m);
        }
      } else {
        result.push(m);
      }
    }
    return result;
  }

  /** Tra id heritage thật theo slug curated (exact). */
  private async resolveHeritageBySlug(slug: string): Promise<{ id: string; slug: string } | null> {
    try {
      const row = await this.heritageRepo
        .createQueryBuilder('h')
        .where('h.slug = :slug', { slug })
        .limit(1)
        .getOne();
      return row ? { id: row.id, slug: row.slug } : null;
    } catch {
      return null;
    }
  }

  /** Tìm trang heritage thật có tiêu đề CHỨA tên node (an toàn, tránh match nhầm). */
  private async resolveHeritageByName(
    name: string,
  ): Promise<{ id: string; slug: string } | null> {
    const core = name
      .replace(/^(Trận|Hội nghị|Phủ|Đền|Chùa|Thành|Khu di tích)\s+/i, '')
      .trim();
    if (core.length < 3) return null;
    try {
      const row = await this.heritageRepo
        .createQueryBuilder('h')
        .where(
          "f_unaccent(lower(h.title)) LIKE '%' || f_unaccent(lower(:core)) || '%'",
          { core },
        )
        .orderBy('length(h.title)', 'ASC')
        .limit(1)
        .getOne();
      return row ? { id: row.id, slug: row.slug } : null;
    } catch {
      return null;
    }
  }

  async createTrip(dto: CreateTripDto) {
    if (!dto.userId) throw new BadRequestException('Thiếu người dùng');
    const points = Array.isArray(dto.points) ? dto.points : [];

    // ── Phase A: auto-match di sản trên tuyến (ưu tiên server-side) ──
    const detected = await this.detectHeritages(points as any);
    // gộp thêm heritageIds client gửi (nếu có id chưa match được thì vẫn giữ)
    const extraIds = (Array.isArray(dto.heritageIds) ? dto.heritageIds : []).filter(
      (id) => !detected.some((d) => d.id === id),
    );
    const heritageIds = [...detected.map((d) => d.id), ...extraIds];

    // kcal ước tính nếu có cân nặng
    let kcal: number | null = null;
    const weight = Number(dto.weightKg);
    if (weight && weight > 0 && dto.durationSec > 0) {
      kcal = Math.round((MET_WALK * weight * dto.durationSec) / 3600);
    }

    // ── Phase B: bonus khi trải nghiệm lại hành trình khác ──
    let followedTrip: TripModel | null = null;
    let followBonus = 0;
    if (dto.followedTripId) {
      followedTrip = await this.tripRepo.findById(dto.followedTripId);
      if (
        followedTrip &&
        followedTrip.distanceM > 0 &&
        (dto.distanceM || 0) >= followedTrip.distanceM * 0.6
      ) {
        followBonus = XP_FOLLOW_BONUS;
      }
    }

    // XP
    const km = (dto.distanceM || 0) / 1000;
    const xp = Math.round(
      XP_BASE + km * XP_PER_KM + heritageIds.length * XP_PER_HERITAGE + followBonus,
    );

    const trip = await this.tripRepo.create({
      userId: dto.userId,
      displayName: dto.displayName ?? null,
      avatarUrl: dto.avatarUrl ?? null,
      title: dto.title?.trim() || this.autoTitle(detected),
      startedAt: dto.startedAt ? new Date(dto.startedAt) : null,
      endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
      durationSec: dto.durationSec || 0,
      distanceM: dto.distanceM || 0,
      kcal,
      points: JSON.stringify(points),
      coverPhoto: dto.coverPhoto ?? null,
      heritageIds: JSON.stringify(heritageIds),
      heritageNames: JSON.stringify(detected),
      heritageCount: heritageIds.length,
      followedTripId: followedTrip ? followedTrip.id : null,
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

    // ── Phase A: retro-link các check-in trong khung giờ hành trình ──
    if (trip.startedAt && trip.endedAt) {
      await this.checkInRepo
        .createQueryBuilder()
        .update(CheckInModel)
        .set({ tripId: trip.id })
        .where('user_id = :userId', { userId: dto.userId })
        .andWhere('trip_id IS NULL')
        .andWhere('created_at BETWEEN :start AND :end', {
          start: trip.startedAt,
          end: trip.endedAt,
        })
        .execute();
    }

    const progress = await this.gamification.awardXp(dto.userId, xp);

    return {
      trip: this.hydrate(trip, { moments }),
      progress,
      followBonus,
    };
  }

  private autoTitle(detected: TripHeritage[]): string {
    if (detected.length === 1) return `Hành trình qua ${detected[0].name}`;
    if (detected.length > 1) return `Hành trình qua ${detected.length} di sản`;
    return 'Hành trình khám phá';
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
    // Số người đã "trải nghiệm lại" hành trình này
    const followCount = await this.tripRepo.countFollowers(id);
    // Các con tem đã điểm danh trên hành trình
    const checkIns = await this.checkInRepo.find({
      where: { tripId: id },
      order: { createdAt: 'ASC' },
    });
    return this.hydrate(trip, {
      moments,
      followCount,
      checkIns: checkIns.map((c) => ({
        id: c.id,
        heritageId: c.heritageId,
        heritageTitle: c.heritageTitle,
        photoUrl: c.photoUrl,
        verified: c.verified,
        createdAt: c.createdAt,
      })),
    });
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
