import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

export interface JwtPayload {
  sub: string;       // userId
  userId?: string;
  email?: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

/**
 * Extract the current authenticated user from the request.
 * Usage: @CurrentUser() user: JwtPayload
 *        @CurrentUser('sub') userId: string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
