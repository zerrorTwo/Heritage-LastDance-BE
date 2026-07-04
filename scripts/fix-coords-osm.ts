/**
 * DeepSeek-powered coordinate fixer.
 * Fetches all 1370 heritage sites from the AI service, sends them in batches
 * to DeepSeek to get accurate OSM coordinates, then outputs a fix map.
 *
 * Usage: DEEPSEEK_API_KEY=sk-... npx ts-node --transpile-only scripts/fix-coords-osm.ts
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const BATCH_SIZE = 25;
const DELAY_MS = 500;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

interface HeritageSite {
  id: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
  categories?: string[];
  description?: string;
}

interface OsmCoord {
  name: string;
  province: string;
  oldLat: number;
  oldLng: number;
  newLat: number;
  newLng: number;
  osmDisplayName: string;
  confidence: number;
  errorKm?: number;
}

interface OsmResult {
  updated: OsmCoord[];
  skipped: Array<{ name: string; province: string; reason: string }>;
  notFound: Array<{ name: string; province: string }>;
  errors: string[];
}

const VN_BOUNDS = { minLat: 8.3, maxLat: 23.4, minLng: 102.1, maxLng: 109.5 };

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= VN_BOUNDS.minLat &&
    lat <= VN_BOUNDS.maxLat &&
    lng >= VN_BOUNDS.minLng &&
    lng <= VN_BOUNDS.maxLng
  );
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function callDeepSeek(prompt: string): Promise<string> {
  const response = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a geographic data assistant. Return ONLY valid JSON. No markdown, no explanation, no code fences.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices?.[0]?.message?.content || '';
}

function parseDeepSeekResponse(
  content: string,
  batch: HeritageSite[],
): Array<{ name: string; lat: number; lng: number } | null> {
  // Try to extract JSON from the response
  let json = content.trim();

  // Remove markdown code fences if present
  json = json.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  // Try to find JSON array
  const arrayMatch = json.match(/\[[\s\S]*\]/);
  if (arrayMatch) json = arrayMatch[0];

  try {
    const results = JSON.parse(json);
    if (!Array.isArray(results)) return batch.map(() => null);

    return batch.map((site, i) => {
      const match = results.find((r: any) => {
        if (!r) return false;
        const rName = (r.name || '').toLowerCase();
        const sName = site.name.toLowerCase();
        return (
          rName.includes(sName.slice(0, 5)) ||
          sName.includes(rName.slice(0, 5))
        );
      });

      if (
        !match ||
        !Number.isFinite(match.lat) ||
        !Number.isFinite(match.lng)
      ) {
        return null;
      }

      return { name: site.name, lat: Number(match.lat), lng: Number(match.lng) };
    });
  } catch {
    // Fallback: parse line by line
    const results: Array<{ name: string; lat: number; lng: number }> = [];
    const lines = content.split('\n');
    for (const line of lines) {
      const coordMatch = line.match(
        /(\d+\.\d+)[,\s]+(\d+\.\d+)/,
      );
      if (coordMatch) {
        results.push({
          name: '',
          lat: Number(coordMatch[1]),
          lng: Number(coordMatch[2]),
        });
      }
    }

    if (results.length >= batch.length) {
      return batch.map((site, i) => ({
        name: site.name,
        lat: results[i].lat,
        lng: results[i].lng,
      }));
    }

    return batch.map(() => null);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!DEEPSEEK_API_KEY) {
    console.error('ERROR: DEEPSEEK_API_KEY env var is required');
    process.exit(1);
  }

  // 1. Fetch all sites from AI service
  console.log(`Fetching sites from ${AI_SERVICE_URL}/api/v1/heritage-sites ...`);
  let sites: HeritageSite[];
  try {
    const resp = await fetch(`${AI_SERVICE_URL}/api/v1/heritage-sites`);
    sites = (await resp.json()) as HeritageSite[];
  } catch (err) {
    console.error('Failed to fetch sites:', (err as Error).message);
    process.exit(1);
  }
  console.log(`Got ${sites.length} sites`);

  // 2. Process in batches
  const result: OsmResult = { updated: [], skipped: [], notFound: [], errors: [] };
  const batches: HeritageSite[][] = [];
  for (let i = 0; i < sites.length; i += BATCH_SIZE) {
    batches.push(sites.slice(i, i + BATCH_SIZE));
  }

  console.log(`Processing ${batches.length} batches of ${BATCH_SIZE} sites each...`);

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    const progress = `[${bi + 1}/${batches.length}]`;

    // Build prompt
    const siteList = batch
      .map((s, i) => `${i + 1}. ${s.name}, ${s.province}, Vietnam`)
      .join('\n');

    const prompt = `For each Vietnamese heritage site below, return its EXACT latitude and longitude coordinates. Return ONLY a JSON array of objects with keys "name", "lat", "lng". No explanation, no markdown. Use this format: [{"name":"Site Name","lat":XX.XXXXXX,"lng":YY.YYYYYY}]

${siteList}`;

    try {
      const content = await callDeepSeek(prompt);
      const parsed = parseDeepSeekResponse(content, batch);

      for (let i = 0; i < batch.length; i++) {
        const site = batch[i];
        const coord = parsed[i];

        if (!coord) {
          result.notFound.push({ name: site.name, province: site.province });
          continue;
        }

        if (!isValidCoord(coord.lat, coord.lng)) {
          result.skipped.push({
            name: site.name,
            province: site.province,
            reason: `Invalid coords: (${coord.lat}, ${coord.lng})`,
          });
          continue;
        }

        const distance = haversineKm(
          site.lat,
          site.lng,
          coord.lat,
          coord.lng,
        );

        const item: OsmCoord = {
          name: site.name,
          province: site.province,
          oldLat: site.lat,
          oldLng: site.lng,
          newLat: coord.lat,
          newLng: coord.lng,
          osmDisplayName: site.name,
          confidence: distance > 100 ? 0.3 : distance > 10 ? 0.6 : 0.9,
          errorKm: Math.round(distance * 100) / 100,
        };

        if (distance < 0.5) {
          result.skipped.push({
            name: site.name,
            province: site.province,
            reason: `Already accurate (<500m): ${item.errorKm}km`,
          });
        } else {
          result.updated.push(item);
        }
      }

      console.log(
        `${progress} Batch done — updated: ${result.updated.length} | skipped: ${result.skipped.length} | notFound: ${result.notFound.length}`,
      );
    } catch (err) {
      const msg = `Batch ${bi + 1} error: ${(err as Error).message}`;
      console.error(msg);
      result.errors.push(msg);
    }

    await sleep(DELAY_MS);
  }

  // 3. Write output
  const outputPath = resolve(__dirname, '../../data/osm_coords.json');
  writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\n=== DONE ===`);
  console.log(`Updated: ${result.updated.length} sites`);
  console.log(`Skipped: ${result.skipped.length} sites`);
  console.log(`Not found: ${result.notFound.length} sites`);
  console.log(`Errors: ${result.errors.length} batches`);
  console.log(`Output: ${outputPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
