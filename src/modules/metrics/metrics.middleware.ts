import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      if (req.originalUrl === '/api/metrics') return;

      const durationSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
      this.metricsService.recordHttpRequest(
        req.method,
        this.getRouteLabel(req),
        res.statusCode,
        durationSeconds,
      );
    });

    next();
  }

  private getRouteLabel(req: Request): string {
    const routePath = req.route?.path;
    const baseUrl = req.baseUrl || '';

    if (typeof routePath === 'string') return `${baseUrl}${routePath}` || req.path;
    return req.path.replace(/[0-9a-fA-F-]{24,36}/g, ':id');
  }
}
