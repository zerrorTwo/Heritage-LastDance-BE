import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import loadEnv from '../../config/configuration';
import type { JwtPayload } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const env = loadEnv();

/**
 * Global JWT auth guard.
 * - Skips routes decorated with @Public()
 * - Validates Authorization: Bearer <token>
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {
    // no-op
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: JwtPayload;
    }>();

    const authHeader = request.headers['authorization'];
    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    if (!headerValue) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const [scheme, token] = headerValue.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization format');
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET as string) as JwtPayload;

      if (!decoded?.sub || !decoded?.sessionId) {
        throw new UnauthorizedException('Invalid token payload');
      }

      request.user = {
        sub: decoded.sub,
        email: decoded.email,
        sessionId: decoded.sessionId,
        iat: decoded.iat,
        exp: decoded.exp,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Token is invalid or expired');
    }
  }
}
