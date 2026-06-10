import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProgressModel } from './user-progress.model';
import { CheckInModel } from './check-in.model';
import { getNodeCoords } from '../graph/dataset.helpers';
import { HeritageLocation } from '../heritage_location/model';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Danh hiệu theo cấp (lấy cảm hứng "Hào khí Đông A")
const LEVEL_TITLES = [
  'Tân binh',
  'Quân sĩ',
  'Đô úy',
  'Hiệu úy',
  'Tướng quân',
  'Đại tướng',
  'Tiết chế',
  'Quốc công',
];

const XP_NEW_HERITAGE = 50; // điểm danh (đã đến tận nơi) di tích lần đầu
const XP_REVISIT = 10; // điểm danh lại (ngày khác)
// Bán kính cho phép xác thực GPS (mét). Di tích thường rộng nên để rộng rãi.
const CHECKIN_RADIUS_M = Number(process.env.CHECKIN_RADIUS_M || 1500);

/** Khoảng cách Haversine giữa 2 toạ độ, đơn vị mét. */
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

@Injectable()
export class GamificationService {
  constructor(
    @InjectRepository(UserProgressModel)
    private readonly progressRepo: Repository<UserProgressModel>,
    @InjectRepository(CheckInModel)
    private readonly checkInRepo: Repository<CheckInModel>,
    @InjectRepository(HeritageLocation)
    private readonly heritageLocRepo: Repository<HeritageLocation>,
  ) {}

  /** Toạ độ chính thức của di tích: ưu tiên graph (demo Nhà Trần), sau đó tra HeritageLocation (di tích thật). */
  private async resolveCoords(heritageId: string): Promise<{ lat: number; lng: number } | null> {
    const fromGraph = getNodeCoords(heritageId);
    if (fromGraph) return { lat: fromGraph.lat, lng: fromGraph.lng };
    if (!UUID_RE.test(heritageId)) return null; // tránh query uuid sai kiểu
    const loc = await this.heritageLocRepo.findOne({
      where: { heritageId },
      order: { latitude: 'DESC' },
    });
    if (loc && loc.latitude != null && loc.longitude != null) {
      return { lat: Number(loc.latitude), lng: Number(loc.longitude) };
    }
    return null;
  }

  private levelFromXp(xp: number): number {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  private xpForLevel(level: number): number {
    return Math.pow(level - 1, 2) * 100;
  }

  private titleFor(level: number): string {
    return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private yesterday(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  private async getOrCreate(userId: string): Promise<UserProgressModel> {
    let p = await this.progressRepo.findOne({ where: { userId } });
    if (!p) {
      p = this.progressRepo.create({ userId, xp: 0, level: 1, streakCount: 0, longestStreak: 0 });
      p = await this.progressRepo.save(p);
    }
    return p;
  }

  private decorate(p: UserProgressModel, extra: Record<string, any> = {}) {
    const level = p.level;
    const curBase = this.xpForLevel(level);
    const nextBase = this.xpForLevel(level + 1);
    return {
      userId: p.userId,
      xp: p.xp,
      level,
      title: this.titleFor(level),
      streakCount: p.streakCount,
      longestStreak: p.longestStreak,
      lastCheckInDate: p.lastCheckInDate,
      xpIntoLevel: p.xp - curBase,
      xpForNextLevel: nextBase - curBase,
      nextLevelTitle: this.titleFor(level + 1),
      ...extra,
    };
  }

  /**
   * B1: điểm danh tại di tích — XP chỉ được cấp khi XÁC THỰC GPS (đã đến tận nơi),
   * hoặc chế độ demo. Ảnh là bằng chứng (không bắt buộc, không tự kiểm duyệt nội dung).
   */
  async checkIn(
    userId: string,
    heritageId: string,
    opts: {
      heritageTitle?: string;
      lat?: number;
      lng?: number;
      accuracy?: number;
      photoUrl?: string;
      visibility?: 'private' | 'public';
      demo?: boolean;
      displayName?: string;
      avatarUrl?: string;
    } = {},
  ) {
    const progress = await this.getOrCreate(userId);
    const today = this.today();

    // ── Cổng xác thực GPS ──
    const official = await this.resolveCoords(heritageId);
    let distanceM: number | null = null;
    if (!opts.demo) {
      if (opts.lat == null || opts.lng == null) {
        return this.decorate(progress, {
          rejected: true,
          reason: 'no_location',
          message: 'Cần bật định vị (GPS) để điểm danh tại di tích.',
        });
      }
      if (!official) {
        return this.decorate(progress, {
          rejected: true,
          reason: 'no_official_coords',
          message: 'Di tích này chưa có toạ độ chuẩn để xác thực.',
        });
      }
      distanceM = haversineM(opts.lat, opts.lng, official.lat, official.lng);
      if (distanceM > CHECKIN_RADIUS_M) {
        return this.decorate(progress, {
          rejected: true,
          reason: 'too_far',
          distanceM,
          radiusM: CHECKIN_RADIUS_M,
          message: `Bạn đang cách di tích khoảng ${(distanceM / 1000).toFixed(1)} km. Hãy đến trong phạm vi ${(CHECKIN_RADIUS_M / 1000).toFixed(1)} km để điểm danh.`,
        });
      }
    } else {
      distanceM = 0; // demo: coi như đang đứng tại di tích
    }

    // ── Chống "cày": mỗi di tích chỉ tính XP một lần mỗi ngày ──
    const last = await this.checkInRepo.findOne({
      where: { userId, heritageId },
      order: { createdAt: 'DESC' },
    });
    const isNewStamp = !last;
    const lastDay = last?.createdAt ? new Date(last.createdAt).toISOString().slice(0, 10) : null;

    if (last && lastDay === today) {
      return this.decorate(progress, {
        isNewStamp: false,
        xpAwarded: 0,
        leveledUp: false,
        streakChanged: false,
        alreadyToday: true,
        verified: true,
        distanceM,
      });
    }

    const xpAwarded = isNewStamp ? XP_NEW_HERITAGE : XP_REVISIT;

    // Streak: chỉ cập nhật một lần mỗi ngày
    let streakChanged = false;
    if (progress.lastCheckInDate !== today) {
      if (progress.lastCheckInDate === this.yesterday()) {
        progress.streakCount += 1;
      } else {
        progress.streakCount = 1;
      }
      progress.lastCheckInDate = today;
      progress.longestStreak = Math.max(progress.longestStreak, progress.streakCount);
      streakChanged = true;
    }

    const prevLevel = progress.level;
    progress.xp += xpAwarded;
    progress.level = this.levelFromXp(progress.xp);
    const leveledUp = progress.level > prevLevel;
    await this.progressRepo.save(progress);

    await this.checkInRepo.save(
      this.checkInRepo.create({
        userId,
        heritageId,
        heritageTitle: opts.heritageTitle ?? null,
        displayName: opts.displayName ?? null,
        avatarUrl: opts.avatarUrl ?? null,
        lat: opts.lat ?? null,
        lng: opts.lng ?? null,
        photoUrl: opts.photoUrl ?? null,
        distanceM,
        verified: true,
        visibility: opts.visibility === 'public' ? 'public' : 'private',
        status: 'active',
        xpAwarded,
      }),
    );

    return this.decorate(progress, {
      isNewStamp,
      xpAwarded,
      leveledUp,
      streakChanged,
      verified: true,
      distanceM,
      demo: !!opts.demo,
    });
  }

  /** Admin kiểm duyệt một check-in (ẩn/khôi phục) — reactive moderation. */
  async moderate(checkInId: string, action: 'hide' | 'restore') {
    const row = await this.checkInRepo.findOne({ where: { id: checkInId } });
    if (!row) return { ok: false, message: 'Không tìm thấy check-in' };
    row.status = action === 'hide' ? 'hidden' : 'active';
    await this.checkInRepo.save(row);
    return { ok: true, id: row.id, status: row.status };
  }

  /** Tiến trình tổng quan. */
  async getProgress(userId: string) {
    const p = await this.getOrCreate(userId);
    const total = await this.checkInRepo.count({ where: { userId } });
    const distinct = await this.checkInRepo
      .createQueryBuilder('c')
      .select('COUNT(DISTINCT c.heritageId)', 'cnt')
      .where('c.userId = :userId', { userId })
      .getRawOne<{ cnt: string }>();
    return this.decorate(p, {
      totalCheckIns: total,
      distinctHeritages: Number(distinct?.cnt ?? 0),
    });
  }

  /** B2: Hộ chiếu di sản — danh sách "tem" (di tích đã điểm danh). */
  async getPassport(userId: string) {
    // Lấy toàn bộ check-in active của user rồi gộp theo di tích bằng JS (đơn giản, chắc chắn).
    const rows = await this.checkInRepo.find({
      where: { userId, status: 'active' },
      order: { createdAt: 'ASC' },
    });

    const byHeritage = new Map<string, any>();
    for (const r of rows) {
      let s = byHeritage.get(r.heritageId);
      if (!s) {
        s = {
          heritageId: r.heritageId,
          heritageTitle: r.heritageTitle,
          visits: 0,
          verified: false,
          photoUrl: null,
          visibility: 'private',
          firstVisit: r.createdAt,
          lastVisit: r.createdAt,
        };
        byHeritage.set(r.heritageId, s);
      }
      s.visits += 1;
      s.verified = s.verified || !!r.verified;
      s.lastVisit = r.createdAt;
      if (r.heritageTitle) s.heritageTitle = r.heritageTitle;
      // ảnh + quyền riêng tư theo lần mới nhất (rows đã sắp tăng dần)
      if (r.photoUrl) s.photoUrl = r.photoUrl;
      s.visibility = r.visibility || s.visibility;
    }

    return Array.from(byHeritage.values()).sort(
      (a, b) => new Date(a.firstVisit).getTime() - new Date(b.firstVisit).getTime(),
    );
  }

  /** Feed cộng đồng: các check-in CÔNG KHAI mới nhất (lọc theo di tích nếu có). */
  async getCommunity(heritageId?: string, limit = 24) {
    const qb = this.checkInRepo
      .createQueryBuilder('c')
      .where("c.status = 'active'")
      .andWhere("c.visibility = 'public'")
      .orderBy('c.createdAt', 'DESC')
      .take(Math.min(60, Math.max(1, limit)));
    if (heritageId) qb.andWhere('c.heritageId = :heritageId', { heritageId });
    const rows = await qb.getMany();
    return rows.map((r) => ({
      id: r.id,
      heritageId: r.heritageId,
      heritageTitle: r.heritageTitle,
      displayName: r.displayName || 'Nhà thám hiểm',
      avatarUrl: r.avatarUrl || null,
      photoUrl: r.photoUrl || null,
      verified: r.verified,
      createdAt: r.createdAt,
    }));
  }

  /** Danh sách heritageId user đã ghé thăm (cho badge "đã ghé thăm"). */
  async getVisited(userId: string) {
    const rows = await this.checkInRepo
      .createQueryBuilder('c')
      .select('DISTINCT c.heritageId', 'heritageId')
      .where('c.userId = :userId', { userId })
      .andWhere("c.status = 'active'")
      .getRawMany();
    return rows.map((r) => r.heritageId);
  }
}
