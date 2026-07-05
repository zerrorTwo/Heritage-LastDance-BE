import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('should expose prometheus metrics and record HTTP requests', async () => {
    const service = new MetricsService();

    service.recordHttpRequest('GET', '/api/ping', 200, 0.01);

    const metrics = await service.getMetrics();

    expect(service.getContentType()).toContain('text/plain');
    expect(metrics).toContain('http_requests_total');
    expect(metrics).toContain('method="GET"');
    expect(metrics).toContain('route="/api/ping"');
    expect(metrics).toContain('status_code="200"');
  });
});
