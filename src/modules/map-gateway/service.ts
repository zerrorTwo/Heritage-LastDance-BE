import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

type JsonValue = Record<string, any> | any[] | string | number | boolean | null;

@Injectable()
export class MapGatewayService {
  private readonly baseUrl = (process.env.AI_SERVICE_URL || 'http://localhost:8001').replace(/\/$/, '');

  async health() {
    const ai = await this.request('/health', { timeoutMs: 5000 });
    return { gateway: 'ok', ai_service: ai, version: process.env.APP_VERSION || '1.0.0' };
  }

  async recommendTrip(payload: Record<string, any>) {
    return this.request('/api/v1/recommend', {
      method: 'POST',
      body: payload,
      timeoutMs: 120000,
    });
  }

  async planRoute(payload: Record<string, any>) {
    return this.request('/api/v1/routes/plan', {
      method: 'POST',
      body: payload,
      timeoutMs: 120000,
    });
  }

  async listHeritageSites(province?: string) {
    const data = await this.request('/api/v1/heritage-sites', { timeoutMs: 10000 });
    if (!province || !Array.isArray(data)) return data;
    return data.filter((site) => site?.province === province);
  }

  async getHeritageSite(siteId: string) {
    return this.request(`/api/v1/heritage-sites/${encodeURIComponent(siteId)}`, { timeoutMs: 10000 });
  }

  async getSiteReviews(siteId: string) {
    return this.request(`/api/v1/heritage-sites/${encodeURIComponent(siteId)}/reviews`, { timeoutMs: 15000 });
  }

  async enrichSite(siteId: string) {
    return this.request(`/api/v1/heritage-sites/${encodeURIComponent(siteId)}/enrich`, { timeoutMs: 30000 });
  }

  async getSiteImages(siteId: string) {
    return this.request(`/api/v1/heritage-sites/${encodeURIComponent(siteId)}/images`, { timeoutMs: 15000 });
  }

  private async request(
    path: string,
    options: { method?: 'GET' | 'POST'; body?: JsonValue; timeoutMs?: number } = {},
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 30000);

    let response: globalThis.Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: options.method || 'GET',
        ...(options.body === undefined
          ? {}
          : {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(options.body),
            }),
        signal: controller.signal,
      });
    } catch (error) {
      throw new ServiceUnavailableException(
        `AI service unavailable at ${this.baseUrl}: ${(error as Error).message}`,
      );
    } finally {
      clearTimeout(timeout);
    }

    const payload = await this.readPayload(response);
    if (!response.ok) {
      const detail =
        payload && typeof payload === 'object' && 'detail' in payload
          ? String((payload as { detail: unknown }).detail)
          : response.statusText;
      throw new BadGatewayException(`AI service error (${response.status}): ${detail}`);
    }
    return payload;
  }

  private async readPayload(response: globalThis.Response) {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}
