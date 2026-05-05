import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: string;       // userId
  email: string;
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
