import 'dotenv/config';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { In } from 'typeorm';
import loadEnv from '../../config/configuration';
loadEnv();

import { dataSource } from '../../config/database';
import { HeritageItem } from '../heritage/model';
import { HeritageLocation } from '../heritage_location/model';

export interface MapHeritageSeedItem {
  id: string;
  name: string;
  province?: string;
  lat?: number;
  lng?: number;
  categories?: string[];
  description?: string;
  long_description?: string;
  visit_tips?: string;
  reference_url?: string;
  opening_hours?: string;
  estimated_visit_minutes?: number;
  indoor_score?: number;
  outdoor_score?: number;
  suitable_for_children?: boolean;
  suitable_for_elderly?: boolean;
  ticket_price?: number;
  popularity_score?: number;
  historical_importance_score?: number;
}

export interface SeedSummary {
  created: number;
  updated: number;
  locationsCreated: number;
  locationsUpdated: number;
  skippedInvalid: number;
}

export function slugifyVietnamese(value: string) {
  const vietnameseCharMap: Record<string, string> = {
    a: 'áàảãạăắằẳẵặâấầẩẫậ',
    d: 'đ',
    e: 'éèẻẽẹêếềểễệ',
    i: 'íìỉĩị',
    o: 'óòỏõọôốồổỗộơớờởỡợ',
    u: 'úùủũụưứừửữự',
    y: 'ýỳỷỹỵ',
  };

  let slug = value.toLowerCase().trim();
  for (const [ascii, chars] of Object.entries(vietnameseCharMap)) {
    slug = slug.replace(new RegExp(`[${chars}]`, 'g'), ascii);
  }
  return slug
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildHeritageSeedData(item: MapHeritageSeedItem) {
  const categories = Array.isArray(item.categories) ? item.categories.filter(Boolean) : [];
  const summary = item.description || item.long_description || '';
  const contentParts = [item.long_description || item.description || ''];
  if (item.visit_tips) contentParts.push(`Kinh nghiệm tham quan: ${item.visit_tips}`);

  return {
    heritage: {
      slug: slugifyVietnamese(item.name),
      title: item.name,
      summary,
      content: contentParts.filter(Boolean).join('\n\n') || summary,
      type: categories[0] || 'heritage',
      status: 'published',
      publishedAt: new Date(),
      sourceUrl: item.reference_url || null,
      recognition: {
        mapSourceId: item.id,
        categories,
        openingHours: item.opening_hours || undefined,
        estimatedVisitMinutes: item.estimated_visit_minutes,
        indoorScore: item.indoor_score,
        outdoorScore: item.outdoor_score,
        suitableForChildren: item.suitable_for_children,
        suitableForElderly: item.suitable_for_elderly,
        ticketPrice: item.ticket_price,
        popularityScore: item.popularity_score,
        historicalImportanceScore: item.historical_importance_score,
      },
    },
    location: {
      name: item.name,
      latitude: item.lat,
      longitude: item.lng,
      address: item.province || null,
      countryCode: 'VN',
    },
  };
}

export function findMatchingLocation<T extends { latitude: any; longitude: any }>(
  locations: T[],
  latitude?: number,
  longitude?: number,
): T | undefined {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return locations[0];
  return locations.find(
    (location) =>
      Math.abs(Number(location.latitude) - Number(latitude)) < 0.000001 &&
      Math.abs(Number(location.longitude) - Number(longitude)) < 0.000001,
  ) || locations[0];
}

export function resolveMapDataPath() {
  const candidates = [
    process.env.MAP_HERITAGE_DATA_PATH,
    resolve(process.cwd(), '../Map/data/deepseek_clean.json'),
    resolve(process.cwd(), '../../../Map/data/deepseek_clean.json'),
    '/home/pearnationmale/Documents/LastDance/BE/Map/data/deepseek_clean.json',
    resolve(process.cwd(), '../Map/data/curated_heritage.json'),
    resolve(process.cwd(), '../../../Map/data/curated_heritage.json'),
    '/home/pearnationmale/Documents/LastDance/BE/Map/data/curated_heritage.json',
  ].filter(Boolean) as string[];

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`Cannot find Map heritage data. Tried: ${candidates.join(', ')}`);
  }
  return found;
}

export function readMapHeritageData(filePath = resolveMapDataPath()): MapHeritageSeedItem[] {
  const data = JSON.parse(readFileSync(filePath, 'utf8'));
  if (!Array.isArray(data)) throw new Error(`Map heritage data must be an array: ${filePath}`);
  return data;
}

export async function seedMapHeritageData(items: MapHeritageSeedItem[]): Promise<SeedSummary> {
  if (!dataSource.isInitialized) await dataSource.initialize();
  const heritageRepo = dataSource.getRepository(HeritageItem);
  const locationRepo = dataSource.getRepository(HeritageLocation);
  const summary: SeedSummary = {
    created: 0,
    updated: 0,
    locationsCreated: 0,
    locationsUpdated: 0,
    skippedInvalid: 0,
  };

  for (const item of items) {
    if (!item?.id || !item?.name || !Number.isFinite(item.lat) || !Number.isFinite(item.lng)) {
      summary.skippedInvalid += 1;
      continue;
    }

    const mapped = buildHeritageSeedData(item);
    const existing = await heritageRepo.findOne({ where: { slug: mapped.heritage.slug } });
    const saved = existing
      ? await heritageRepo.save({ ...existing, ...mapped.heritage })
      : await heritageRepo.save(mapped.heritage);

    if (existing) summary.updated += 1;
    else summary.created += 1;

    const existingLocations = await locationRepo.find({ where: { heritageId: saved.id } });
    const matchedLocation = findMatchingLocation(existingLocations, item.lat, item.lng);
    if (matchedLocation) {
      await locationRepo.save({
        ...matchedLocation,
        ...mapped.location,
        heritageId: saved.id,
      });
      summary.locationsUpdated += 1;
    } else {
      await locationRepo.save({
        ...mapped.location,
        heritageId: saved.id,
      });
      summary.locationsCreated += 1;
    }
  }

  await removeDuplicateLocations();
  return summary;
}

async function removeDuplicateLocations() {
  const locationRepo = dataSource.getRepository(HeritageLocation);
  const rows = await locationRepo.find();
  const grouped = new Map<string, HeritageLocation[]>();
  for (const row of rows) {
    const key = `${row.heritageId}:${Number(row.latitude).toFixed(6)}:${Number(row.longitude).toFixed(6)}`;
    grouped.set(key, [...(grouped.get(key) || []), row]);
  }
  const duplicateIds = [...grouped.values()].flatMap((group) => group.slice(1).map((row) => row.id));
  if (duplicateIds.length) await locationRepo.delete({ id: In(duplicateIds) });
}

export async function main() {
  const filePath = resolveMapDataPath();
  const items = readMapHeritageData(filePath);
  console.log(`[seed:map-data] Loading ${items.length} heritage items from ${filePath}`);
  const summary = await seedMapHeritageData(items);
  console.log(
    `[seed:map-data] completed: created=${summary.created} updated=${summary.updated} locationsCreated=${summary.locationsCreated} locationsUpdated=${summary.locationsUpdated} skippedInvalid=${summary.skippedInvalid}`,
  );
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('[seed:map-data] failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      if (dataSource.isInitialized) await dataSource.destroy();
    });
}
