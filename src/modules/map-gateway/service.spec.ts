import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { MapGatewayService } from './service';

describe('MapGatewayService', () => {
  const originalFetch = global.fetch;
  const originalAiUrl = process.env.AI_SERVICE_URL;

  beforeEach(() => {
    process.env.AI_SERVICE_URL = 'http://ai-service.test/';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.AI_SERVICE_URL = originalAiUrl;
    jest.restoreAllMocks();
  });

  it('proxies trip recommendations to the Map AI recommend endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ itinerary_id: 'it-1' }),
    });
    global.fetch = fetchMock as any;

    const service = new MapGatewayService();
    const result = await service.recommendTrip({ destination_area: 'Hà Nội' });

    expect(fetchMock).toHaveBeenCalledWith('http://ai-service.test/api/v1/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination_area: 'Hà Nội' }),
      signal: expect.any(AbortSignal),
    });
    expect(result).toEqual({ itinerary_id: 'it-1' });
  });

  it('filters heritage sites by province after reading from AI service', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify([
        { id: 'hn-1', province: 'Hà Nội' },
        { id: 'hue-1', province: 'Thừa Thiên Huế' },
      ]),
    }) as any;

    const service = new MapGatewayService();
    const result = await service.listHeritageSites('Hà Nội');

    expect(result).toEqual([{ id: 'hn-1', province: 'Hà Nội' }]);
  });

  it('throws 503 when AI service is unreachable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('connection refused')) as any;

    const service = new MapGatewayService();

    await expect(service.getHeritageSite('vn-hn-001')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws 502 when AI service returns a non-success response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => JSON.stringify({ detail: 'planner failed' }),
    }) as any;

    const service = new MapGatewayService();

    await expect(service.planRoute({ sites: [] })).rejects.toBeInstanceOf(BadGatewayException);
  });
});
