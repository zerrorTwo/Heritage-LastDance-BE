import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { generateSecureToken } from '../utils/random/token.util';

// ── ANSI color helpers ──────────────────────────────────────────────────────
const c = {
  reset:    '\x1b[0m',
  bold:     '\x1b[1m',
  // grays
  lightGray: '\x1b[37m',
  darkGray:  '\x1b[90m',
  white:     '\x1b[97m',
  // methods
  green:    '\x1b[32m',
  yellow:   '\x1b[33m',
  blue:     '\x1b[34m',
  magenta:  '\x1b[35m',
  cyan:     '\x1b[36m',
  red:      '\x1b[31m',
};

const colorize = (color: string, text: string) => `${color}${text}${c.reset}`;

/** Format current time: 2026-01-02 15:04:05.000 */
const nowStr = (): string => {
  const d = new Date();
  const pad = (n: number, w = 2) => n.toString().padStart(w, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
  );
};

/** Level badge — always 3 chars wide */
const levelBadge = (level: 'INF' | 'WRN' | 'ERR'): string => {
  const map: Record<string, string> = {
    INF: colorize(c.cyan, 'INF'),
    WRN: colorize(c.yellow, 'WRN'),
    ERR: colorize(c.red, 'ERR'),
  };
  return map[level];
};

/** Method — 3-char abbreviation with per-method color */
const methodBadge = (method: string): string => {
  const map: Record<string, [string, string]> = {
    GET:    ['GET', c.green],
    POST:   ['PST', c.blue],
    PUT:    ['PUT', c.yellow],
    PATCH:  ['PTC', c.magenta],
    DELETE: ['DEL', c.red],
  };
  const [abbr, color] = map[method.toUpperCase()] ?? [method.slice(0, 3).toUpperCase(), c.white];
  return colorize(color + c.bold, abbr);
};

/** Status code with traffic-light coloring */
const statusBadge = (code: number): string => {
  const color = code < 400 ? c.green : code < 500 ? c.yellow : c.red;
  return colorize(color + c.bold, code.toString().padStart(3));
};

/**
 * LoggerMiddleware
 *
 * Logs every request in slog-inspired columnar format:
 * [timestamp]  LVL  MTD  /path                                         STS   XXms  trace_id=abc ip=1.2.3.4
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const traceId = generateSecureToken(4); // 8 hex chars
    (req as Request & { traceId?: string }).traceId = traceId;

    res.on('finish', () => {
      const latency   = Date.now() - start;
      const level     = res.statusCode >= 500 ? 'ERR' : res.statusCode >= 400 ? 'WRN' : 'INF';
      const timestamp = colorize(c.lightGray, `[${nowStr()}]`);
      const method    = methodBadge(req.method);
      const path      = colorize(c.white, req.originalUrl.padEnd(45));
      const status    = statusBadge(res.statusCode);
      const lat       = colorize(c.darkGray, `${latency}ms`.padStart(7));
      const extra     = colorize(c.darkGray, `trace_id=${traceId} ip=${req.ip ?? '-'}`);

      process.stdout.write(
        `${timestamp}  ${levelBadge(level)}  ${method}  ${path}  ${status}  ${lat}  ${extra}\n`,
      );
    });

    next();
  }
}
