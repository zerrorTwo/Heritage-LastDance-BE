import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiGatewayService {
  private aiServiceUrl: string;

  constructor(private configService: ConfigService) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://localhost:5055';
  }

  private async fetchFromAi(path: string, options: RequestInit = {}) {
    const url = `${this.aiServiceUrl}${path}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });

      if (!response.ok) {
        let errorDetail = response.statusText;
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorDetail;
        } catch (e) {}
        throw new HttpException(errorDetail, response.status);
      }
      
      return await response.json();
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`AI service unavailable: ${error.message}`, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async health() {
    let aiHealthy = false;
    try {
      const response = await fetch(`${this.aiServiceUrl}/health`, { signal: AbortSignal.timeout(5000) });
      aiHealthy = response.status === 200;
    } catch (e) {}

    return {
      gateway: 'ok',
      ai_service: aiHealthy ? 'ok' : 'unreachable',
      version: '0.1.0',
    };
  }

  async recommendTrip(payload: any) {
    return this.fetchFromAi('/api/v1/recommend', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async planRoute(payload: any) {
    return this.fetchFromAi('/api/v1/routes/plan', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listHeritageSites(province?: string) {
    try {
      let data = await this.fetchFromAi('/api/v1/heritage-sites');
      if (province) {
        data = data.filter((s: any) => s.province === province);
      }
      return data;
    } catch (error) {
      // Fallback: return empty array like the python _load_local_sites()
      let sites: any[] = [];
      if (province) {
        sites = sites.filter((s: any) => s.province === province);
      }
      return sites;
    }
  }

  async getSiteReviews(siteId: string) {
    return this.fetchFromAi(`/api/v1/heritage-sites/${siteId}/reviews`);
  }

  async enrichSite(siteId: string) {
    return this.fetchFromAi(`/api/v1/heritage-sites/${siteId}/enrich`);
  }

  async getSiteImages(siteId: string) {
    return this.fetchFromAi(`/api/v1/heritage-sites/${siteId}/images`);
  }

  async getHeritageSite(siteId: string) {
    return this.fetchFromAi(`/api/v1/heritage-sites/${siteId}`);
  }
}
