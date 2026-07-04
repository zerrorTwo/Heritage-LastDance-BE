import { buildHeritageSeedData, findMatchingLocation, slugifyVietnamese } from './seed-map-data';

describe('Map seed data helpers', () => {
  it('slugifies Vietnamese heritage names consistently', () => {
    expect(slugifyVietnamese('Văn Miếu - Quốc Tử Giám')).toBe('van-mieu-quoc-tu-giam');
    expect(slugifyVietnamese('Miếu Bà Chúa Xứ Núi Sam')).toBe('mieu-ba-chua-xu-nui-sam');
  });

  it('maps a Map heritage item to Heritage DB fields', () => {
    const mapped = buildHeritageSeedData({
      id: 'vn-hn-001',
      name: 'Văn Miếu - Quốc Tử Giám',
      province: 'Hà Nội',
      lat: 21.0278,
      lng: 105.8364,
      categories: ['history', 'architecture'],
      description: 'Trường đại học đầu tiên của Việt Nam',
      opening_hours: '08:00-17:00',
      estimated_visit_minutes: 90,
      indoor_score: 0.3,
      outdoor_score: 0.7,
      suitable_for_children: true,
      suitable_for_elderly: true,
      ticket_price: 30000,
      popularity_score: 0.95,
      historical_importance_score: 0.95,
    });

    expect(mapped.heritage.slug).toBe('van-mieu-quoc-tu-giam');
    expect(mapped.heritage.title).toBe('Văn Miếu - Quốc Tử Giám');
    expect(mapped.heritage.status).toBe('published');
    expect(mapped.heritage.type).toBe('history');
    expect(mapped.heritage.summary).toBe('Trường đại học đầu tiên của Việt Nam');
    expect(mapped.heritage.recognition).toEqual({
      mapSourceId: 'vn-hn-001',
      categories: ['history', 'architecture'],
      openingHours: '08:00-17:00',
      estimatedVisitMinutes: 90,
      indoorScore: 0.3,
      outdoorScore: 0.7,
      suitableForChildren: true,
      suitableForElderly: true,
      ticketPrice: 30000,
      popularityScore: 0.95,
      historicalImportanceScore: 0.95,
    });
    expect(mapped.location).toEqual({
      name: 'Văn Miếu - Quốc Tử Giám',
      latitude: 21.0278,
      longitude: 105.8364,
      address: 'Hà Nội',
      countryCode: 'VN',
    });
  });

  it('matches an existing primary location instead of creating duplicates', () => {
    const existing = findMatchingLocation([
      { id: 'loc-1', latitude: '21.027800', longitude: '105.836400' },
    ], 21.0278, 105.8364);

    expect(existing?.id).toBe('loc-1');
  });
});
